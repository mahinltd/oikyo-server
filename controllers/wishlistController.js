import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';

/**
 * Add a product to wishlist (Public)
 */
const addToWishlist = asyncHandler(async (req, res) => {
  // Validation schema for adding to wishlist
  const addToWishlistSchema = Joi.object({
    userIdentifier: Joi.string()
      .pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$|^[\+]?[1-9][\d]{0,15}$/)
      .required(),
    productId: Joi.string().required(),
  });

  const { error, value } = addToWishlistSchema.validate(req.body);
  if (error) {
    return res.status(400).json(errorResponse(400, error.details[0].message));
  }

  // Validate product exists
  const product = await Product.findById(value.productId);
  if (!product) {
    return res.status(404).json(errorResponse(404, 'Product not found'));
  }

  // Add product to wishlist
  const wishlist = await Wishlist.addProduct(value.userIdentifier, value.productId);

  res.status(200).json(
    successResponse(200, wishlist, 'Product added to wishlist successfully')
  );
});

/**
 * Remove a product from wishlist (Public)
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  // Validation schema for removing from wishlist
  const removeFromWishlistSchema = Joi.object({
    userIdentifier: Joi.string()
      .pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$|^[\+]?[1-9][\d]{0,15}$/)
      .required(),
    productId: Joi.string().required(),
  });

  const { error, value } = removeFromWishlistSchema.validate(req.body);
  if (error) {
    return res.status(400).json(errorResponse(400, error.details[0].message));
  }

  // Remove product from wishlist
  const wishlist = await Wishlist.removeProduct(value.userIdentifier, value.productId);

  if (!wishlist) {
    return res.status(404).json(errorResponse(404, 'Wishlist not found'));
  }

  res.status(200).json(
    successResponse(200, wishlist, 'Product removed from wishlist successfully')
  );
});

/**
 * Get wishlist for a user (Public)
 */
const getWishlist = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  // Validate identifier format (email or phone)
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  
  if (!emailRegex.test(identifier) && !phoneRegex.test(identifier)) {
    return res.status(400).json(errorResponse(400, 'Invalid email or phone number format'));
  }

  // Get wishlist with populated products
  const wishlist = await Wishlist.getWishlistWithProducts(identifier);

  if (!wishlist) {
    return res.status(200).json(
      successResponse(200, { products: [] }, 'Wishlist is empty')
    );
  }

  res.status(200).json(
    successResponse(200, wishlist, 'Wishlist retrieved successfully')
  );
});

export {
  addToWishlist,
  removeFromWishlist,
  getWishlist
};