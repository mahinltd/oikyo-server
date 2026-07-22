import express from 'express';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middlewares/authMiddleware.js';
import Joi from 'joi';

const router = express.Router();

/**
 * Register FCM token for a user
 * POST /api/notifications/register-token
 */
router.post('/register-token', auth, asyncHandler(async (req, res) => {
  const tokenSchema = Joi.object({
    fcmToken: Joi.string().required().messages({
      'string.empty': 'FCM token is required',
      'any.required': 'FCM token is required'
    }),
    userType: Joi.string().valid('admin', 'customer').default('admin').messages({
      'any.only': 'User type must be admin or customer'
    })
  });

  const { error, value } = tokenSchema.validate(req.body);
  if (error) {
    return res.status(400).json(errorResponse(400, error.details[0].message));
  }

  try {
    const { fcmToken, userType } = value;
    
    // Check if token already exists for this user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json(errorResponse(404, 'User not found'));
    }

    // Add token if it doesn't exist
    if (!user.fcmTokens.includes(fcmToken)) {
      user.fcmTokens.push(fcmToken);
      await user.save();
    }

    res.status(200).json(successResponse(200, { 
      message: 'FCM token registered successfully',
      fcmToken
    }, 'FCM token registered successfully'));
  } catch (error) {
    res.status(500).json(errorResponse(500, error.message));
  }
}));

/**
 * Unregister FCM token for a user
 * DELETE /api/notifications/unregister-token
 */
router.delete('/unregister-token', auth, asyncHandler(async (req, res) => {
  const tokenSchema = Joi.object({
    fcmToken: Joi.string().required().messages({
      'string.empty': 'FCM token is required',
      'any.required': 'FCM token is required'
    })
  });

  const { error, value } = tokenSchema.validate(req.body);
  if (error) {
    return res.status(400).json(errorResponse(400, error.details[0].message));
  }

  try {
    const { fcmToken } = value;
    
    // Remove token from user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json(errorResponse(404, 'User not found'));
    }

    user.fcmTokens = user.fcmTokens.filter(token => token !== fcmToken);
    await user.save();

    res.status(200).json(successResponse(200, { 
      message: 'FCM token unregistered successfully',
      fcmToken
    }, 'FCM token unregistered successfully'));
  } catch (error) {
    res.status(500).json(errorResponse(500, error.message));
  }
}));

/**
 * Get user's notifications
 * GET /api/notifications
 */
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type; // Optional filter by notification type
    
    const query = { userId: req.user.id };
    if (type) {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalNotifications: total,
      hasNext: (page * limit) < total,
      hasPrev: page > 1,
    };

    res.status(200).json(successResponse(200, {
      notifications,
      pagination
    }, 'Notifications retrieved successfully'));
  } catch (error) {
    res.status(500).json(errorResponse(500, error.message));
  }
}));

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', auth, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json(errorResponse(404, 'Notification not found'));
    }

    res.status(200).json(successResponse(200, notification, 'Notification marked as read'));
  } catch (error) {
    res.status(500).json(errorResponse(500, error.message));
  }
}));

/**
 * Mark all notifications as read
 * PUT /api/notifications/mark-all-read
 */
router.put('/mark-all-read', auth, asyncHandler(async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json(successResponse(200, {}, 'All notifications marked as read'));
  } catch (error) {
    res.status(500).json(errorResponse(500, error.message));
  }
}));

export default router;