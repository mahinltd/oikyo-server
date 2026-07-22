import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { triggerSync } from '../controllers/syncController.js';

const router = express.Router();

// POST /api/sync/products - Trigger product sync from Mahasagar (Protected: Admin Only)
router.post('/products', authMiddleware, triggerSync);

export default router;