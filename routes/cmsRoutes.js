import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getSettings,
  updateSettings,
  getPages,
  getPageBySlug,
  createPage,
  updatePage,
  deletePage,
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/cmsController.js';

const router = express.Router();

// Site Settings routes
router.route('/settings')
  .get(getSettings) // Public
  .put(authMiddleware, updateSettings); // Protected

// Content Pages routes
router.route('/pages')
  .get(getPages) // Public - gets all active pages
  .post(authMiddleware, createPage); // Protected

// Single page by slug - public
router.get('/pages/:slug', getPageBySlug);

// Protected pages routes
router.route('/pages/:slug')
  .put(authMiddleware, updatePage) // Protected
  .delete(authMiddleware, deletePage); // Protected

// Banners routes
router.route('/banners')
  .get(getBanners) // Public - gets all active banners
  .post(authMiddleware, createBanner); // Protected

router.route('/banners/:id')
  .put(authMiddleware, updateBanner) // Protected
  .delete(authMiddleware, deleteBanner); // Protected

export default router;