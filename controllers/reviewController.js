import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import logger from '../config/logger.js';
import { getCloudinary } from '../config/cloudinary.js';
import NotificationService from '../services/notificationService.js';

/**
 * Create a new review
 */
const createReview = asyncHandler(async (req, res) => {
  try {
    const reviewSchema = Joi.object({
      productId: Joi.string().required().messages({
        'any.required': 'Product ID is required'
      }),
      customerName: Joi.string().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
      customerEmail: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
      rating: Joi.number().integer().min(1).max(5).required().messages({
        'number.min': 'Rating must be at least 1 star',
        'number.max': 'Rating cannot exceed 5 stars',
        'any.required': 'Rating is required'
      }),
      comment: Joi.string().min(10).max(1000).required().messages({
        'string.min': 'Comment must be at least 10 characters long',
        'string.max': 'Comment cannot exceed 1000 characters',
        'any.required': 'Comment is required'
      })
    });

    const { error, value } = reviewSchema.validate(req.body);
    if (error) {
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    const { productId, customerName, customerEmail, rating, comment } = value;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json(errorResponse(404, 'Product not found'));
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      'product': productId,
      'customerEmail': customerEmail
    });

    if (existingReview) {
      return res.status(400).json(errorResponse(400, 'You have already reviewed this product'));
    }

    // Process uploaded images if any
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const cloudinary = getCloudinary();
      if (!cloudinary) {
        return res.status(500).json(errorResponse(500, 'Cloudinary is not configured properly'));
      }
      
      // Validate number of images
      if (req.files.length > 3) {
        return res.status(400).json(errorResponse(400, 'Maximum 3 images allowed per review'));
      }

      // Upload each image to Cloudinary
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'reviews',
            resource_type: 'image',
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          });
          imageUrls.push(result.secure_url);
        } catch (uploadError) {
          logger.error(`Cloudinary upload error: ${uploadError.message}`);
          return res.status(500).json(errorResponse(500, 'Error uploading images'));
        }
      }
    }

    // Create new review
    const newReview = new Review({
      product: productId,
      customerName,
      customerEmail,
      rating,
      comment,
      images: imageUrls,
      status: 'pending' // Reviews start as pending for admin approval
    });

    const savedReview = await newReview.save();

    // Send notification about new pending review
    await NotificationService.sendReviewNotification(savedReview);

    logger.info(`New review created: ${savedReview._id} for product: ${productId}`);

    res.status(201).json(
      successResponse(201, savedReview, 'Review submitted successfully. Awaiting approval.')
    );
  } catch (error) {
    logger.error(`Error creating review: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

/**
 * Get reviews for a specific product
 */
const getProductReviews = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product ID
    if (!productId) {
      return res.status(400).json(errorResponse(400, 'Product ID is required'));
    }

    // Get approved reviews for the product
    const reviews = await Review.find({
      product: productId,
      status: 'approved'
    }).sort({ createdAt: -1 });

    // Calculate average rating
    let averageRating = 0;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = parseFloat((totalRating / reviews.length).toFixed(1));
    }

    res.status(200).json(
      successResponse(200, { 
        reviews, 
        averageRating 
      }, 'Product reviews retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting product reviews: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

/**
 * Get all reviews (Admin only)
 */
const getAllReviews = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status; // Filter by status: pending, approved, rejected

    const query = {};
    if (statusFilter) {
      query.status = statusFilter;
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const reviews = await Review.find(query)
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Review.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalReviews: total,
      hasNext: endIndex < total,
      hasPrev: startIndex > 0,
    };

    res.status(200).json(
      successResponse(200, { reviews, pagination }, 'Reviews retrieved successfully')
    );
  } catch (error) {
    logger.error(`Error getting all reviews: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

/**
 * Approve a review (Admin only)
 */
const approveReview = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        status: 'approved',
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('product', 'name');

    if (!review) {
      return res.status(404).json(errorResponse(404, 'Review not found'));
    }

    logger.info(`Review approved: ${review._id}`);

    res.status(200).json(
      successResponse(200, review, 'Review approved successfully')
    );
  } catch (error) {
    logger.error(`Error approving review: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

/**
 * Reject a review (Admin only)
 */
const rejectReview = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // Optional rejection reason

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        status: 'rejected',
        rejectionReason: reason || 'Not specified',
        updatedAt: Date.now()
      },
      { new: true }
    ).populate('product', 'name');

    if (!review) {
      return res.status(404).json(errorResponse(404, 'Review not found'));
    }

    logger.info(`Review rejected: ${review._id}`);

    res.status(200).json(
      successResponse(200, review, 'Review rejected successfully')
    );
  } catch (error) {
    logger.error(`Error rejecting review: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

/**
 * Delete a review (Admin only)
 */
const deleteReview = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      return res.status(404).json(errorResponse(404, 'Review not found'));
    }

    // Delete associated images from Cloudinary if they exist and if cloudinary is configured
    if (review.images && review.images.length > 0) {
      const cloudinary = getCloudinary();
      if (cloudinary) {
        for (const imageUrl of review.images) {
          try {
            // Extract public ID from Cloudinary URL
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`reviews/${publicId}`, {
              resource_type: 'image'
            });
          } catch (cloudinaryError) {
            logger.error(`Error deleting image from Cloudinary: ${cloudinaryError.message}`);
            // Continue with deletion even if image deletion fails
          }
        }
      }
    }

    logger.info(`Review deleted: ${review._id}`);

    res.status(200).json(
      successResponse(200, {}, 'Review deleted successfully')
    );
  } catch (error) {
    logger.error(`Error deleting review: ${error.message}`);
    res.status(500).json(errorResponse(500, error.message));
  }
});

export {
  createReview,
  getProductReviews,
  getAllReviews,
  approveReview,
  rejectReview,
  deleteReview
};