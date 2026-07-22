import express from 'express';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist
} from '../controllers/wishlistController.js';

const router = express.Router();

// Public routes
router.post('/add', addToWishlist); // Add product to wishlist (Public)
router.delete('/remove', removeFromWishlist); // Remove product from wishlist (Public)
router.get('/:identifier', getWishlist); // Get wishlist for user (Public)

export default router;