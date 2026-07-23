import axios from 'axios';
import Product from '../models/Product.js';
import logger from '../config/logger.js';
import { cacheInvalidatePattern } from '../config/redis.js';
import NotificationService from './notificationService.js';

/**
 * Fetches products from Mahasagar API and syncs them to MongoDB
 * @returns {object} Result of the sync operation with counts of processed products
 */
const syncProductsFromMahasagar = async () => {
  try {
    logger.info('Starting product sync from Mahasagar API...');
    
    // Get API credentials from environment variables
    const apiUrl = process.env.MAHASAGAR_API_URL;
    const apiKey = process.env.MAHASAGAR_API_KEY;
    const secretKey = process.env.MAHASAGAR_SECRET_KEY;
    
    if (!apiUrl || !apiKey) {
      const errorMsg = 'Missing Mahasagar API configuration. Please check MAHASAGAR_API_URL and MAHASAGAR_API_KEY in environment variables.';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Initialize counters
    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Start from page 1
    let currentPage = 1;
    let totalPages = 1; // We'll update this after the first request
    
    // Headers for the API request
    const headers = {
      'api-key': apiKey,
      'secret-key': secretKey || '', // Use secret key if available
      'Content-Type': 'application/json',
    };

    // Continue fetching until all pages are processed
    while (currentPage <= totalPages) {
      logger.info(`Fetching page ${currentPage}...`);
      
      try {
        // Make request to Mahasagar API
        const response = await axios.get(`${apiUrl}?page=${currentPage}`, {
          headers,
          timeout: 30000, // 30 seconds timeout
        });

        // According to documentation, the response has a "products" array
        const { products, last_page, total, status } = response.data;

        // Update total pages on first request
        if (currentPage === 1) {
          totalPages = last_page;
          logger.info(`Total pages to process: ${totalPages}, Total products: ${total}, Status: ${status}`);
        }

        // Process products from the current page
        if (Array.isArray(products) && products.length > 0) {
          logger.info(`Processing ${products.length} products from page ${currentPage}...`);
          
          // Log the first raw product to see the actual structure
          if (currentPage === 1) {
            logger.info('First raw product from API:', JSON.stringify(products[0], null, 2));
          }
          
          for (const mahasagarProduct of products) {
            try {
              // Transform the Mahasagar product to match our Product schema
              const transformedProduct = transformMahasagarProduct(mahasagarProduct);
              
              // Log the first transformed product to see the mapping
              if (processedCount === 0) {
                logger.info('First transformed product:', JSON.stringify(transformedProduct, null, 2));
              }

              // Check if product already exists by sourceId
              const existingProduct = await Product.findOne({ sourceId: transformedProduct.sourceId });

              if (existingProduct) {
                // Update existing product (respect manual overrides)
                if (existingProduct.manualOverride && 
                    (existingProduct.manualOverride.price !== undefined || 
                     existingProduct.manualOverride.stock !== undefined || 
                     existingProduct.manualOverride.isActive !== undefined)) {
                  // Skip updating price, stock, isActive if manual override is enabled
                  transformedProduct.price = existingProduct.price;
                  transformedProduct.stock = existingProduct.stock;
                  transformedProduct.status = existingProduct.status;
                }
                
                // Update other fields
                Object.assign(existingProduct, transformedProduct);
                existingProduct.lastSyncedAt = new Date();
                await existingProduct.save();
                updatedCount++;
                logger.info(`Updated product: ${transformedProduct.name} (${transformedProduct.sourceId})`);
                              
                // Check for low stock and send alert if needed
                if (existingProduct.stock < 5) {
                  await NotificationService.sendLowStockAlert(existingProduct);
                }
              } else {
                // Create new product
                transformedProduct.lastSyncedAt = new Date();
                const newProduct = await Product.create(transformedProduct);
                createdCount++;
                logger.info(`Created product: ${transformedProduct.name} (${transformedProduct.sourceId})`);
                              
                // Check for low stock and send alert if needed
                if (newProduct.stock < 5) {
                  await NotificationService.sendLowStockAlert(newProduct);
                }
              }
              
              processedCount++;
            } catch (error) {
              logger.error(`Error processing product:`, {
                productId: mahasagarProduct?.id,
                productName: mahasagarProduct?.name,
                error: error.message,
                errorType: error.name,
                validationErrors: error.errors ? Object.keys(error.errors).map(key => ({
                  field: key,
                  message: error.errors[key].message
                })) : null
              });
              errorCount++;
            }
          }
        } else {
          logger.info(`No products found on page ${currentPage}`);
        }
        
        currentPage++;
      } catch (error) {
        logger.error(`Error fetching page ${currentPage}: ${error.message}`);
        errorCount++;
        // Break the loop on error to prevent infinite retries
        break;
      }
    }
    
    logger.info(`Product sync completed: ${processedCount} processed, ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${errorCount} errors`);

    // Check for low stock products after sync
    try {
      const lowStockProducts = await Product.find({ 
        stock: { $gt: 0, $lt: 5 },
        status: 'active'
      });
      
      logger.info(`Found ${lowStockProducts.length} products with low stock after sync`);
      
      for (const product of lowStockProducts) {
        await NotificationService.sendLowStockAlert(product);
      }
    } catch (lowStockError) {
      logger.warn(`Low stock check failed after sync: ${lowStockError.message}`);
    }
    
    // Invalidate product-related caches after sync
    try {
      await cacheInvalidatePattern('products:*');
      await cacheInvalidatePattern('featured_products:*');
      await cacheInvalidatePattern('categories:*');
      await cacheInvalidatePattern('deals:*');
      await cacheInvalidatePattern('trending:*');
      await cacheInvalidatePattern('top_selling_products:*');
      logger.info('Product-related caches invalidated after sync');
    } catch (cacheError) {
      logger.warn(`Cache invalidation failed after sync: ${cacheError.message}`);
    }
    
    return {
      success: true,
      message: `Product sync completed successfully. Processed ${processedCount} products.`,
      stats: {
        processed: processedCount,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    };
  } catch (error) {
    logger.error(`Error during product sync: ${error.message}`);
    return {
      success: false,
      message: `Failed to sync products: ${error.message}`,
      stats: {
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
      },
    };
  }
};

/**
 * Transforms a Mahasagar product object to match our Product schema
 * @param {object} mahasagarProduct - The product object from Mahasagar API
 * @returns {object} - Transformed product object
 */
const transformMahasagarProduct = (mahasagarProduct) => {
  logger.debug('Transforming product with raw data:', {
    id: mahasagarProduct.id,
    name: mahasagarProduct.name,
    category: mahasagarProduct.category,
    product_code: mahasagarProduct.product_code,
    price: mahasagarProduct.price,
    product_variants: Array.isArray(mahasagarProduct.product_variants) ? `Array with ${mahasagarProduct.product_variants.length} variants` : typeof mahasagarProduct.product_variants
  });
  
  // Extract images safely from product_images array
  let images = [];
  if (Array.isArray(mahasagarProduct.product_images)) {
    images = mahasagarProduct.product_images
      .filter(img => img && img.product_image)
      .map(img => {
        // Make sure the image URL is complete (add base URL if needed)
        if (img.product_image.startsWith('http')) {
          return img.product_image;
        } else {
          // Assuming the API returns relative paths that need to be converted to full URLs
          // This might need adjustment based on actual API image URL format
          return img.product_image.includes('http') ? img.product_image : `https://mahasagar-api.com/${img.product_image}`;
        }
      })
      .filter(url => url); // Remove any null/undefined urls
  } else if (Array.isArray(mahasagarProduct.product_image)) {
    // Fallback to the old field name if needed
    images = mahasagarProduct.product_image
      .filter(img => img && img.product_image)
      .map(img => img.product_image)
      .filter(url => url);
  }
  
  // Handle pricing - prioritize reselling_price over regular price
  let price = Number(mahasagarProduct.reselling_price) || Number(mahasagarProduct.price) || 0;
  let salePrice = Number(mahasagarProduct.sale_price) || null;
  
  // Status mapping: if external status === 3 (or any positive integer), set to 'active'
  // Only set to 'inactive' if external API explicitly returns status === 0
  let status = 'active'; // Default to active
  if (typeof mahasagarProduct.status !== 'undefined') {
    status = Number(mahasagarProduct.status) === 0 ? 'inactive' : 'active';
  }
  
  // Handle stock - since API doesn't provide stock count, set default value
  // Use manualOverride.stock if exists, otherwise default to 50
  let stock = 50; // Default value
  if (typeof mahasagarProduct.stock !== 'undefined') {
    stock = Number(mahasagarProduct.stock) || 0;
  }
  
  // Handle category - ensure it's a valid string
  let category = String(mahasagarProduct.category || mahasagarProduct.category_id || 'Uncategorized').trim();
  
  // Ensure name is valid
  const name = mahasagarProduct.name || mahasagarProduct.product_name || mahasagarProduct.title || `Product ${mahasagarProduct.id}`;
  
  // Ensure description is valid
  const description = mahasagarProduct.details || 
                     mahasagarProduct.description || 
                     mahasagarProduct.desc || 
                     mahasagarProduct.short_description || 
                     '';

  // Use product_code as an alternative identifier
  const sourceId = String(mahasagarProduct.product_code || mahasagarProduct.id || mahasagarProduct.product_id);

  // Extract attributes from product_variant and product_attribute if available
  const attributes = {
    sizes: [],
    colors: [],
    variants: []
  };

  // Extract variants and attributes from product_variants array
  if (Array.isArray(mahasagarProduct.product_variants)) {
    mahasagarProduct.product_variants.forEach(variant => {
      if (variant.size && !attributes.sizes.includes(variant.size)) {
        attributes.sizes.push(variant.size);
      }
      if (variant.color && !attributes.colors.includes(variant.color)) {
        attributes.colors.push(variant.color);
      }
      if (variant.name || variant.variant_name) {
        attributes.variants.push({
          name: variant.name || variant.variant_name,
          value: variant.value || variant.id || variant.variant_value || variant.variant_name
        });
      }
    });
  }

  // Also handle product_attributes if available
  if (Array.isArray(mahasagarProduct.product_attributes)) {
    mahasagarProduct.product_attributes.forEach(attr => {
      if (attr.size && !attributes.sizes.includes(attr.size)) {
        attributes.sizes.push(attr.size);
      }
      if (attr.color && !attributes.colors.includes(attr.color)) {
        attributes.colors.push(attr.color);
      }
      if (attr.name) {
        attributes.variants.push({
          name: attr.name,
          value: attr.value || attr.id
        });
      }
    });
  }

  // Map Mahasagar product fields to our Product schema
  const transformedProduct = {
    sourceId: sourceId,
    name: name.trim(),
    description: description.trim(),
    category: category,
    price: price,
    salePrice: salePrice,
    images: images,
    stock: stock,
    status: status,
    isFeatured: false, // Default value, can be set based on some criteria
    attributes: attributes,
    manualOverride: {
      price: null,
      stock: null,
      isActive: null,
    },
  };
  
  logger.debug('Transformed product result:', transformedProduct);
  
  return transformedProduct;
};

export default syncProductsFromMahasagar;