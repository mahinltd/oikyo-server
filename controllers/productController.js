import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { 
  sanitizeDescription, 
  generateShortDescription, 
  calculateDiscountPercentage 
} from '../utils/htmlSanitizer.js';
import logger from '../config/logger.js';
import { 
  cacheGet, 
  cacheSet, 
  cacheInvalidatePattern 
} from '../config/redis.js';
import { 
  generateProductListCacheKey,
  generateCategoryCacheKey,
  generateDealsCacheKey,
  generateTrendingCacheKey
} from '../utils/cache.js';

// Helper function to generate slug from product name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .trim();
};

/**
 * Get all active products with advanced pagination and filtering
 * Query params: page, limit, category, minPrice, maxPrice, search, sort
 */
const getAllProducts = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sort
    } = req.query;

    // Generate cache key
    const cacheKey = generateProductListCacheKey(req);
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Build dynamic query object
    let query = { status: 'active' }; // Only active products

    // Add category filter if provided
    if (category) {
      query.category = { $regex: category, $options: 'i' }; // Case insensitive
    }

    // Add price range filter if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination values
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit))); // Cap limit at 100, minimum 1
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default to newest first
    if (sort === 'price_low_to_high') {
      sortObj = { price: 1 };
    } else if (sort === 'price_high_to_low') {
      sortObj = { price: -1 };
    } else if (sort === 'name_asc') {
      sortObj = { name: 1 };
    } else if (sort === 'name_desc') {
      sortObj = { name: -1 };
    } else if (sort === 'popularity') {
      sortObj = { salesCount: -1, views: -1 }; // Sort by sales and views
    } else if (sort === 'discount') {
      // Sort by discount percentage (requires aggregation)
      // This will be handled separately in a dedicated function
    }

    // Execute query with pagination and projection
    const products = await Product.find(query)
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views') // Select only necessary fields for listing
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const totalCount = await Product.countDocuments(query);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    const hasMore = pageNum < totalPages; // For infinite scroll

    // Add discount percentage to each product for list view
    const enhancedProducts = products.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, {
      products: enhancedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts: totalCount,
        hasNextPage,
        hasPrevPage,
        hasMore, // For infinite scroll
        limit: limitNum
      }
    }, 'Products fetched successfully');

    // Cache the result for 5 minutes (300 seconds)
    await cacheSet(cacheKey, result, 300);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getAllProducts: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch products')
    );
  }
});

/**
 * Get a single product by ID or slug with full details
 */
const getProductDetails = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Find product by ID or slug, and ensure it's active
    const product = await Product.findOne({
      $and: [
        { $or: [{ _id: id }, { slug: id }] }, // Support both ID and slug
        { status: 'active' }
      ]
    }).lean();

    if (!product) {
      logger.warn(`Product not found: ${id}`);
      return res.status(404).json(
        errorResponse(404, 'Product not found', 'The requested product does not exist or is inactive')
      );
    }

    // Calculate discount percentage for detail view
    const enhancedProduct = {
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      sanitizedDescription: sanitizeDescription(product.description, 500) // Longer description for detail view
    };

    // Increment view count (non-blocking operation)
    Product.updateOne(
      { _id: product._id },
      { $inc: { views: 1 } }
    ).catch(err => logger.error(`Error updating view count: ${err.message}`));

    return res.status(200).json(
      successResponse(200, { product: enhancedProduct }, 'Product details fetched successfully')
    );
  } catch (error) {
    logger.error(`Error in getProductDetails: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch product details')
    );
  }
});

/**
 * Get featured products
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Generate cache key
    const cacheKey = `featured_products:${limit}`;
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Get featured products that are active
    const featuredProducts = await Product.find({
      isFeatured: true,
      status: 'active'
    })
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views') // Select only necessary fields
      .limit(Math.min(20, Math.max(1, Number(limit)))) // Cap at 20, minimum 1
      .sort({ createdAt: -1 }) // Newest first
      .lean();

    // Add discount percentage to each product
    const enhancedProducts = featuredProducts.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, { products: enhancedProducts }, 'Featured products fetched successfully');

    // Cache the result for 10 minutes (600 seconds)
    await cacheSet(cacheKey, result, 600);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getFeaturedProducts: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch featured products')
    );
  }
});

/**
 * Get products by category with optional filters
 */
const getProductsByCategory = asyncHandler(async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 12,
      minPrice,
      maxPrice,
      search,
      sort
    } = req.query;

    // Generate cache key
    const cacheKey = `products_category:${category}:${page}:${limit}:${minPrice || 0}:${maxPrice || 0}:${search || 'none'}:${sort || 'newest'}`;
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Build query for specific category with active status
    let query = {
      category: { $regex: category, $options: 'i' }, // Case insensitive match
      status: 'active'
    };

    // Add price range filter if provided
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination values
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit))); // Cap limit at 100, minimum 1
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    let sortObj = { createdAt: -1 }; // Default to newest first
    if (sort === 'price_low_to_high') {
      sortObj = { price: 1 };
    } else if (sort === 'price_high_to_low') {
      sortObj = { price: -1 };
    } else if (sort === 'name_asc') {
      sortObj = { name: 1 };
    } else if (sort === 'name_desc') {
      sortObj = { name: -1 };
    } else if (sort === 'popularity') {
      sortObj = { salesCount: -1, views: -1 };
    }

    // Execute query with pagination and projection
    const products = await Product.find(query)
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views') // Select only necessary fields for listing
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean(); // Use lean() for better performance

    // Get total count for pagination
    const totalCount = await Product.countDocuments(query);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    const hasMore = pageNum < totalPages; // For infinite scroll

    // Add discount percentage to each product
    const enhancedProducts = products.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, {
      products: enhancedProducts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts: totalCount,
        hasNextPage,
        hasPrevPage,
        hasMore, // For infinite scroll
        limit: limitNum
      }
    }, 'Category products fetched successfully');

    // Cache the result for 5 minutes (300 seconds)
    await cacheSet(cacheKey, result, 300);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getProductsByCategory: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch products by category')
    );
  }
});

/**
 * Get all unique categories with product counts
 */
const getCategories = asyncHandler(async (req, res) => {
  try {
    // Generate cache key
    const cacheKey = generateCategoryCacheKey();
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Get distinct categories with product counts
    const categoriesWithCounts = await Product.aggregate([
      { $match: { status: 'active' } }, // Only active products
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          count: 1
        }
      },
      { $sort: { count: -1 } } // Sort by count descending
    ]);

    result = successResponse(200, { categories: categoriesWithCounts }, 'Categories fetched successfully');

    // Cache the result for 1 hour (3600 seconds)
    await cacheSet(cacheKey, result, 3600);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getCategories: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch categories')
    );
  }
});

/**
 * Get today's deals (products with salePrice less than regular price)
 */
const getDeals = asyncHandler(async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Generate cache key
    const cacheKey = generateDealsCacheKey();
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Find products with salePrice < price (meaning they are on sale)
    const dealProducts = await Product.find({
      status: 'active',
      salePrice: { $exists: true, $ne: null },
      $expr: { $lt: ['$salePrice', '$price'] } // salePrice < price
    })
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views')
      .limit(Math.min(20, Math.max(1, Number(limit))))
      .sort({ 
        $expr: { $subtract: ['$price', '$salePrice'] } // Sort by highest discount amount first
      })
      .lean();

    // Add discount percentage to each product
    const enhancedProducts = dealProducts.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, { products: enhancedProducts }, 'Deal products fetched successfully');

    // Cache the result for 10 minutes (600 seconds)
    await cacheSet(cacheKey, result, 600);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getDeals: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch deals')
    );
  }
});

/**
 * Get trending products (based on views and recent activity)
 */
const getTrendingProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Generate cache key
    const cacheKey = generateTrendingCacheKey();
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Get trending products: prioritize featured, then by views, then by recency
    const trendingProducts = await Product.find({
      status: 'active'
    })
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views')
      .limit(Math.min(20, Math.max(1, Number(limit))))
      .sort({ 
        isFeatured: -1, // Featured first
        views: -1,       // Then by views
        createdAt: -1    // Then by recency
      })
      .lean();

    // Add discount percentage to each product
    const enhancedProducts = trendingProducts.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, { products: enhancedProducts }, 'Trending products fetched successfully');

    // Cache the result for 10 minutes (600 seconds)
    await cacheSet(cacheKey, result, 600);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getTrendingProducts: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch trending products')
    );
  }
});

/**
 * Get top selling products (based on sales count)
 */
const getTopSellingProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    // Generate cache key
    const cacheKey = `top_selling_products:${limit}`;
    
    // Try to get from cache first
    let result = await cacheGet(cacheKey);
    if (result) {
      logger.http(`Cache HIT: ${cacheKey}`);
      return res.status(200).json(result);
    }

    logger.http(`Cache MISS: ${cacheKey}`);

    // Get top selling products based on sales count
    const topSellingProducts = await Product.find({
      status: 'active'
    })
      .select('_id name price salePrice images category status isFeatured createdAt updatedAt slug salesCount views')
      .limit(Math.min(20, Math.max(1, Number(limit))))
      .sort({ 
        salesCount: -1,  // By sales count first
        views: -1        // Then by views
      })
      .lean();

    // Add discount percentage to each product
    const enhancedProducts = topSellingProducts.map(product => ({
      ...product,
      discountPercentage: calculateDiscountPercentage(product.price, product.salePrice),
      shortDescription: generateShortDescription(product.description)
    }));

    result = successResponse(200, { products: enhancedProducts }, 'Top selling products fetched successfully');

    // Cache the result for 10 minutes (600 seconds)
    await cacheSet(cacheKey, result, 600);
    logger.http(`Cached: ${cacheKey}`);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in getTopSellingProducts: ${error.message}`);
    return res.status(500).json(
      errorResponse(500, 'Internal server error', 'Failed to fetch top selling products')
    );
  }
});

export {
  getAllProducts,
  getProductDetails,
  getFeaturedProducts,
  getProductsByCategory,
  getCategories,
  getDeals,
  getTrendingProducts,
  getTopSellingProducts
};