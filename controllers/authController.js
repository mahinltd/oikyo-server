import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Register a new admin user
 * Protected route that requires a special init key
 */
const registerAdmin = asyncHandler(async (req, res) => {
  // Check for the initialization key in the header
  const initKey = req.headers['x-init-key'];
  if (initKey !== process.env.INIT_KEY) {
    return res
      .status(403)
      .json(errorResponse(403, 'Forbidden: Invalid initialization key'));
  }

  const { name, email, password } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res
      .status(400)
      .json(errorResponse(400, 'Please provide name, email, and password'));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json(errorResponse(400, 'User already exists with this email'));
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Return user info without password and with token
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  res.status(201).json(
    successResponse(201, { user: userData, token }, 'Admin registered successfully')
  );
});

/**
 * Login admin user
 */
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res
      .status(400)
      .json(errorResponse(400, 'Please provide email and password'));
  }

  // Find user by email (password will be excluded due to select: false in schema)
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res
      .status(401)
      .json(errorResponse(401, 'Invalid email or password'));
  }

  // Check if user is active
  if (!user.isActive) {
    return res
      .status(401)
      .json(errorResponse(401, 'Account is deactivated'));
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res
      .status(401)
      .json(errorResponse(401, 'Invalid email or password'));
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  // Return user info without password and with token
  const userData = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  res.status(200).json(
    successResponse(200, { user: userData, token }, 'Login successful')
  );
});

export { registerAdmin, loginAdmin };