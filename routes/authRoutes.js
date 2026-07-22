import express from 'express';
import { registerAdmin, loginAdmin } from '../controllers/authController.js';

const router = express.Router();

// POST /api/auth/register - Register a new admin (requires init key)
router.post('/register', registerAdmin);

// POST /api/auth/login - Login admin user
router.post('/login', loginAdmin);

export default router;