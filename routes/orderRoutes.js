import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  createOrder,
  getOrderByPhone,
  getAllOrders,
  verifyPayment,
  updateOrderStatus
} from '../controllers/orderController.js';

const router = express.Router();

// Public routes
router.route('/')
  .post(createOrder); // Create new order (Public)

// Public route for customers to track their orders by phone
router.get('/phone/:phone', getOrderByPhone);

// Admin routes (Protected)
router.route('/')
  .get(authMiddleware, getAllOrders); // Get all orders (Admin only)

router.post('/:id/verify', authMiddleware, verifyPayment); // Verify payment (Admin only)
router.put('/:id/status', authMiddleware, updateOrderStatus); // Update order status (Admin only)

export default router;