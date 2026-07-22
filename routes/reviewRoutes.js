import express from 'express';
import multer from 'multer';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createReview,
  getProductReviews,
  approveReview,
  rejectReview,
  deleteReview
} from '../controllers/reviewController.js';

// Set up basic multer for handling file uploads
// We'll handle Cloudinary upload in the controller instead
const upload = multer({ 
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit per file
    files: 3 // Max 3 files
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

// Public routes
router.route('/')
  .post(upload.array('images', 3), createReview); // Create new review (Public) with image upload

// Get reviews for a specific product (Public)
router.get('/product/:productId', getProductReviews);

// Admin routes (Protected)
router.put('/:id/approve', authMiddleware, approveReview); // Approve review (Admin only)
router.put('/:id/reject', authMiddleware, rejectReview); // Reject review (Admin only)
router.delete('/:id', authMiddleware, deleteReview); // Delete review (Admin only)

export default router;