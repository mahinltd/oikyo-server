// ©2026 Oikyo Mahin Ltd develop by (Tanvir)
import axios from 'axios';
import Product from '../models/Product.js';
import logger from '../config/logger.js';
import { cacheInvalidatePattern } from '../config/redis.js';
import NotificationService from './notificationService.js';

const syncProductsFromMahasagar = async () => {
  try {
    logger.info('Starting product sync from Mahasagar API...');
    
    const apiUrl = process.env.MAHASAGAR_API_URL;
    const apiKey = process.env.MAHASAGAR_API_KEY;
    const secretKey = process.env.MAHASAGAR_SECRET_KEY;
    
    if (!apiUrl || !apiKey) {
      throw new Error('Missing Mahasagar API configuration in environment variables.');
    }

    let processedCount = 0, createdCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;
    let currentPage = 1, totalPages = 1;
    
    const headers = {
      'api-key': apiKey,
      'secret-key': secretKey || '',
      'Content-Type': 'application/json',
    };

    while (currentPage <= totalPages) {
      logger.info(`Fetching page ${currentPage}...`);
      try {
        const response = await axios.get(`${apiUrl}?page=${currentPage}`, { headers, timeout: 30000 });
        const { products, last_page, total, status } = response.data;

        if (currentPage === 1) {
          totalPages = last_page || 1;
          logger.info(`Total pages: ${totalPages}, Total products: ${total}`);
        }

        if (Array.isArray(products) && products.length > 0) {
          for (const mahasagarProduct of products) {
            try {
              const transformedProduct = transformMahasagarProduct(mahasagarProduct);
              const existingProduct = await Product.findOne({ sourceId: transformedProduct.sourceId });

              if (existingProduct) {
                // Respect manual overrides if configured
                if (existingProduct.manualOverride) {
                  if (existingProduct.manualOverride.price !== undefined && existingProduct.manualOverride.price !== null) {
                    transformedProduct.price = existingProduct.manualOverride.price;
                  }
                  if (existingProduct.manualOverride.stock !== undefined && existingProduct.manualOverride.stock !== null) {
                    transformedProduct.stock = existingProduct.manualOverride.stock;
                  }
                  if (existingProduct.manualOverride.isActive !== undefined && existingProduct.manualOverride.isActive !== null) {
                    transformedProduct.status = existingProduct.manualOverride.isActive ? 'active' : 'inactive';
                  }
                }
                
                Object.assign(existingProduct, transformedProduct);
                existingProduct.lastSyncedAt = new Date();
                await existingProduct.save();
                updatedCount++;
              } else {
                transformedProduct.lastSyncedAt = new Date();
                await Product.create(transformedProduct);
                createdCount++;
              }
              processedCount++;
            } catch (error) {
              logger.error(`Error processing individual product: ${error.message}`);
              errorCount++;
            }
          }
        }
        currentPage++;
      } catch (error) {
        logger.error(`Error fetching page ${currentPage}: ${error.message}`);
        errorCount++;
        break;
      }
    }
    
    logger.info(`Sync finished: Processed ${processedCount}, Created ${createdCount}, Updated ${updatedCount}, Errors ${errorCount}`);

    // Invalidate caches
    try {
      await cacheInvalidatePattern('products:*');
      await cacheInvalidatePattern('featured_products:*');
      await cacheInvalidatePattern('categories:*');
      await cacheInvalidatePattern('deals:*');
      await cacheInvalidatePattern('trending:*');
      await cacheInvalidatePattern('top_selling_products:*');
    } catch (cacheError) {
      logger.warn(`Cache invalidation failed: ${cacheError.message}`);
    }
    
    return {
      success: true,
      message: `Product sync completed. Processed ${processedCount} products.`,
      stats: { processed: processedCount, created: createdCount, updated: updatedCount, skipped: skippedCount, errors: errorCount }
    };
  } catch (error) {
    logger.error(`Error during product sync: ${error.message}`);
    return { success: false, message: `Failed to sync: ${error.message}`, stats: { processed: 0, created: 0, updated: 0, skipped: 0, errors: 1 } };
  }
};

/**
 * Transforms a Mahasagar product object to match our Product schema
 */
const transformMahasagarProduct = (mahasagarProduct) => {
  const baseStorageUrl = 'https://mahasagar.com.bd/public/storage/';
  
  // Extract images safely
  let images = [];
  if (Array.isArray(mahasagarProduct.product_images)) {
    images = mahasagarProduct.product_images
      .filter(img => img && img.product_image)
      .map(img => img.product_image.startsWith('http') ? img.product_image : `${baseStorageUrl}${img.product_image}`);
  } else if (Array.isArray(mahasagarProduct.product_image)) {
    images = mahasagarProduct.product_image
      .filter(img => img && img.product_image)
      .map(img => img.product_image.startsWith('http') ? img.product_image : `${baseStorageUrl}${img.product_image}`);
  }
  
  if (images.length === 0) images = ['https://via.placeholder.com/600x600.png?text=No+Image'];

  // Pricing mapping
  const price = Number(mahasagarProduct.reselling_price) || Number(mahasagarProduct.price) || 0;
  const salePrice = mahasagarProduct.sale_price ? Number(mahasagarProduct.sale_price) : null;
  
  // Calculate discount
  let discountPercentage = 0;
  if (salePrice && salePrice < price) {
    discountPercentage = Math.round(((price - salePrice) / price) * 100);
  }

  // Status mapping: Integer to String
  let status = 'active';
  if (mahasagarProduct.status !== undefined) {
    status = Number(mahasagarProduct.status) === 0 ? 'inactive' : 'active';
  }
  
  // Default stock fallback
  const stock = mahasagarProduct.stock !== undefined ? Number(mahasagarProduct.stock) : 50;
  
  // Identifiers & Category
  const sourceId = String(mahasagarProduct.product_code || mahasagarProduct.id || mahasagarProduct.product_id);
  const category = String(mahasagarProduct.category || 'Uncategorized').trim();
  const name = String(mahasagarProduct.name || mahasagarProduct.product_name || `Product ${sourceId}`).trim();
  
  // Description & HTML Stripping for Short Description
  const description = String(mahasagarProduct.details || mahasagarProduct.description || '').trim();
  const cleanText = description.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  const shortDescription = cleanText.length > 150 ? cleanText.substring(0, 147) + '...' : cleanText;

  // Extract variants and attributes
  const attributes = { sizes: [], colors: [], variants: [] };
  if (Array.isArray(mahasagarProduct.product_variants)) {
    mahasagarProduct.product_variants.forEach(variant => {
      if (variant.size && !attributes.sizes.includes(variant.size)) attributes.sizes.push(variant.size);
      if (variant.color && !attributes.colors.includes(variant.color)) attributes.colors.push(variant.color);
      if (variant.name || variant.variant_name) {
        attributes.variants.push({
          name: variant.name || variant.variant_name,
          value: variant.value || variant.id || variant.variant_value || variant.variant_name
        });
      }
    });
  }

  return {
    sourceId,
    name,
    description,
    shortDescription,
    category,
    price,
    salePrice,
    discountPercentage,
    images,
    stock,
    status,
    isFeatured: false,
    attributes,
    manualOverride: { price: null, stock: null, isActive: null },
  };
};

export default syncProductsFromMahasagar;