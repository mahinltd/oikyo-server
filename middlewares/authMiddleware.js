import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware to authenticate and authorize admin users
 * Verifies JWT token and checks if user role is 'admin'
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json(errorResponse(401, 'Access denied. No token provided.'));
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token payload
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res
        .status(401)
        .json(errorResponse(401, 'Invalid token. User not found.'));
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      return res
        .status(403)
        .json(errorResponse(403, 'Access denied. Admin role required.'));
    }

    // Check if user is active
    if (!user.isActive) {
      return res
        .status(401)
        .json(errorResponse(401, 'User account is deactivated.'));
    }

    // Attach user to request object
    req.user = user;

    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res
        .status(401)
        .json(errorResponse(401, 'Invalid token.'));
    }

    if (error.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json(errorResponse(401, 'Token expired.'));
    }

    return res
      .status(500)
      .json(errorResponse(500, 'Internal server error during authentication.'));
  }
};

export default authMiddleware;