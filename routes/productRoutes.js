import express from 'express';
import {
  getAllProducts,
  getProductDetails,
  getFeaturedProducts,
  getProductsByCategory,
  getCategories,
  getDeals,
  getTrendingProducts,
  getTopSellingProducts
} from '../controllers/productController.js';

const router = express.Router();

// GET /api/products - Get all active products with pagination and filtering
router.get('/', getAllProducts);

// GET /api/products/categories - Get all unique categories with product counts
router.get('/categories', getCategories);

// GET /api/products/featured - Get featured products
router.get('/featured', getFeaturedProducts);

// GET /api/products/deals - Get products on sale (today's deals)
router.get('/deals', getDeals);

// GET /api/products/trending - Get trending products
router.get('/trending', getTrendingProducts);

// GET /api/products/top-selling - Get top selling products
router.get('/top-selling', getTopSellingProducts);

// GET /api/products/:id - Get product details by ID or slug
router.get('/:id', getProductDetails);

// GET /api/products/category/:category - Get products by category with optional filters
router.get('/category/:category', getProductsByCategory);

export default router;