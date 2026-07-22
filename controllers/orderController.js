import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import Joi from 'joi';
import logger from '../config/logger.js';
import NotificationService from '../services/notificationService.js';
import {
  sendOrderConfirmation,
  sendPaymentVerificationSuccess,
  sendPaymentVerificationFailed,
  sendOrderStatusUpdate
} from '../services/emailService.js';

/**
 * Create a new order (Public)
 */
const createOrder = asyncHandler(async (req, res) => {
  try {
    // Validation schema for order creation (excluding status fields that should be auto-assigned)
    const orderSchema = Joi.object({
      customerInfo: Joi.object({
        name: Joi.string().trim().max(100).required(),
        phone: Joi.string().trim().max(20).required(),
        email: Joi.string().email().required(),
        address: Joi.string().trim().max(500).required(),
        city: Joi.string().trim().max(50).required(),
        zip: Joi.string().trim().max(10).required(),
      }).required(),
      items: Joi.array().items(Joi.object({
        productId: Joi.string().required(), // Will validate as ObjectId later
        quantity: Joi.number().integer().min(1).required(),
      })).min(1).required(),
      paymentMethod: Joi.string().valid('bkash', 'nagad', 'rocket', 'cod').required(),
      transactionId: Joi.when('paymentMethod', {
        is: Joi.string().valid('bkash', 'nagad', 'rocket'),
        then: Joi.string().required(),
        otherwise: Joi.string().optional().allow(null, ''),
      }),
      // Explicitly reject any status fields sent by client
      orderStatus: Joi.forbidden(),
      paymentStatus: Joi.forbidden(),
    });

    const { error, value } = orderSchema.validate(req.body);
    if (error) {
      logger.warn(`Invalid order creation request: ${error.details[0].message}`);
      return res.status(400).json(errorResponse(400, error.details[0].message));
    }

    // Validate product IDs and check stock availability
    const session = await Order.startSession();
    let newOrder;

    try {
      await session.withTransaction(async () => {
        // Validate products and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of value.items) {
          // Convert string ID to ObjectId for validation
          if (!mongoose.isValidObjectId(item.productId)) {
            throw new Error(`Invalid product ID: ${item.productId}`);
          }

          const product = await Product.findById(item.productId);
          if (!product) {
            throw new Error(`Product not found: ${item.productId}`);
          }

          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
          }

          // Add item to order with snapshot data
          orderItems.push({
            productId: product._id,
            productName: product.name,
            quantity: item.quantity,
            priceAtPurchase: product.salePrice || product.price, // Use sale price if available, otherwise regular price
            image: product.images && product.images.length > 0 ? product.images[0] : null,
          });

          // Calculate total
          const itemPrice = product.salePrice || product.price;
          totalAmount += itemPrice * item.quantity;

          // Decrease stock
          await Product.findByIdAndUpdate(
            product._id,
            { $inc: { stock: -item.quantity } },
            { session }
          );
        }

        // Determine initial status based on payment method
        // Valid orderStatus values according to the Order model enum: 
        // ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled']
        let orderStatus = 'pending_payment';
        let paymentStatus = 'pending';
        
        if (value.paymentMethod === 'cod') {
          // For COD, we'll set to processing since payment happens on delivery
          orderStatus = 'processing';
          paymentStatus = 'verified'; // COD is considered verified since payment happens on delivery
        }

        // Create order with explicitly set status fields, ensuring no client-provided values are used
        newOrder = await Order.create([{
          customerInfo: value.customerInfo,
          items: orderItems,
          paymentMethod: value.paymentMethod,
          transactionId: value.transactionId || null,
          totalAmount,
          orderStatus, // Server-determined status using only valid enum values
          paymentStatus, // Server-determined status
        }], { session });

        logger.info(`Order created successfully: ${newOrder[0]._id} for customer ${newOrder[0].customerInfo.name}`);

        // Send notification about new order
        await NotificationService.sendOrderNotification(newOrder[0]);

        // Send confirmation email
        try {
          await sendOrderConfirmation(value.customerInfo.email, newOrder[0]);
          logger.info(`Order confirmation email sent to: ${value.customerInfo.email}`);
        } catch (emailError) {
          logger.error(`Failed to send order confirmation email: ${emailError.message}`);
          // Don't fail the order if email sending fails
        }
      });

      res.status(201).json(
        successResponse(201, newOrder[0], 'Order created successfully')
      );
    } catch (error) {
      logger.error(`Error creating order: ${error.message}`);
      // If transaction failed, stock changes would be rolled back
      return res.status(400).json(errorResponse(400, error.message));
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error(`Unexpected error in createOrder: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to create order'));
  }
});

/**
 * Get orders by customer phone (Public - for tracking)
 */
const getOrderByPhone = asyncHandler(async (req, res) => {
  try {
    const { phone } = req.params;

    // Validate phone number
    if (!phone || phone.trim().length === 0) {
      logger.warn(`Invalid phone number provided: ${phone}`);
      return res.status(400).json(errorResponse(400, 'Phone number is required'));
    }

    const orders = await Order.find({ 'customerInfo.phone': phone })
      .sort({ createdAt: -1 })
      .select('-__v'); // Exclude version field

    if (orders.length === 0) {
      logger.info(`No orders found for phone number: ${phone}`);
      return res.status(404).json(errorResponse(404, 'No orders found for this phone number'));
    }

    logger.info(`Retrieved ${orders.length} orders for phone: ${phone}`);

    res.status(200).json(successResponse(200, orders, 'Orders retrieved successfully'));
  } catch (error) {
    logger.error(`Error retrieving orders by phone: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve orders'));
  }
});

/**
 * Get all orders (Admin only)
 */
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    // Extract query parameters for pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const statusFilter = req.query.status; // Filter by order status

    const query = {};
    if (statusFilter) {
      query.orderStatus = statusFilter;
    }

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .select('-__v');

    const total = await Order.countDocuments(query);

    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total,
      hasNext: endIndex < total,
      hasPrev: startIndex > 0,
    };

    logger.info(`Retrieved ${orders.length} orders, page ${page}/${pagination.totalPages}`);

    res.status(200).json(
      successResponse(200, orders, 'Orders retrieved successfully', pagination)
    );
  } catch (error) {
    logger.error(`Error retrieving all orders: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to retrieve orders'));
  }
});

/**
 * Verify payment for an order (Admin only)
 */
const verifyPayment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    // Validate input
    if (!action || !['approve', 'reject'].includes(action)) {
      logger.warn(`Invalid payment verification action: ${action}`);
      return res.status(400).json(errorResponse(400, 'Action is required and must be either "approve" or "reject"'));
    }

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      logger.warn(`Order not found for payment verification: ${id}`);
      return res.status(404).json(errorResponse(404, 'Order not found'));
    }

    // Check if order is already processed
    if (order.paymentStatus !== 'pending') {
      logger.warn(`Payment already processed for order: ${id}, status: ${order.paymentStatus}`);
      return res.status(400).json(errorResponse(400, 'Payment has already been processed for this order'));
    }

    let updatedOrder;
    let emailSent = false;

    if (action === 'approve') {
      // Update order status
      updatedOrder = await Order.findByIdAndUpdate(
        id,
        { 
          paymentStatus: 'verified',
          orderStatus: 'processing'
        },
        { new: true, runValidators: true }
      ).select('-__v');

      logger.info(`Payment approved for order: ${id}`);

      // Send notification about payment verification
      await NotificationService.sendPaymentVerificationNotification(updatedOrder, action);

      // Send payment verification success email
      try {
        await sendPaymentVerificationSuccess(order.customerInfo.email, order);
        emailSent = true;
        logger.info(`Payment verification success email sent to: ${order.customerInfo.email}`);
      } catch (emailError) {
        logger.error(`Failed to send payment verification success email: ${emailError.message}`);
      }
    } else if (action === 'reject') {
      // Start session for transaction to restore stock
      const session = await Order.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Update order status
          updatedOrder = await Order.findByIdAndUpdate(
            id,
            { 
              paymentStatus: 'rejected',
              orderStatus: 'cancelled'
            },
            { new: true, runValidators: true, session }
          ).select('-__v');

          logger.info(`Payment rejected for order: ${id}`);

          // Send notification about payment verification failure
          await NotificationService.sendPaymentVerificationNotification(updatedOrder, action, reason);

          // Restore stock
          for (const item of order.items) {
            await Product.findByIdAndUpdate(
              item.productId,
              { $inc: { stock: item.quantity } },
              { session }
            );
          }
        });

        // Send payment verification failed email
        try {
          await sendPaymentVerificationFailed(order.customerInfo.email, reason, order);
          emailSent = true;
          logger.info(`Payment verification failed email sent to: ${order.customerInfo.email}`);
        } catch (emailError) {
          logger.error(`Failed to send payment verification failed email: ${emailError.message}`);
        }
      } finally {
        await session.endSession();
      }
    }

    const actionMessage = action === 'approve' ? 'approved' : 'rejected';
    logger.info(`Payment ${actionMessage} for order: ${id}`);
    
    res.status(200).json(
      successResponse(200, { order: updatedOrder, emailSent }, `Payment ${actionMessage} successfully`)
    );
  } catch (error) {
    logger.error(`Error verifying payment for order: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to verify payment'));
  }
});

/**
 * Update order status (Admin only)
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info(`Attempting to update order ${id} to ${status}`);

    // Validate status
    const validStatuses = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      logger.warn(`Invalid order status update: ${status}`);
      return res.status(400).json(errorResponse(400, `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`));
    }

    // Find order
    const order = await Order.findById(id);
    if (!order) {
      logger.warn(`Order not found for status update: ${id}`);
      return res.status(404).json(errorResponse(404, 'Order not found'));
    }

    // Check if order can be updated (not already cancelled or delivered)
    if (order.orderStatus === 'delivered' || order.orderStatus === 'cancelled') {
      logger.warn(`Cannot update status of completed/cancelled order: ${id}`);
      return res.status(400).json(errorResponse(400, 'Cannot update status of a completed or cancelled order'));
    }

    // Prevent downgrading status (e.g., delivered back to shipped)
    const statusPriority = {
      'pending_payment': 0,
      'processing': 1,
      'shipped': 2,
      'delivered': 3,
      'cancelled': 4
    };

    if (statusPriority[status] < statusPriority[order.orderStatus]) {
      logger.warn(`Cannot downgrade order status from ${order.orderStatus} to ${status} for order: ${id}`);
      return res.status(400).json(errorResponse(400, 'Cannot downgrade order status'));
    }

    let updatedOrder;

    // If cancelling, restore stock (only if not COD and not already refunded)
    if (status === 'cancelled' && order.orderStatus !== 'cancelled') {
      const session = await Order.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Update order status
          updatedOrder = await Order.findByIdAndUpdate(
            id,
            { orderStatus: 'cancelled' },
            { new: true, runValidators: true, session }
          ).select('-__v');

          logger.info(`Order ${id} cancelled`);

          // Restore stock only if payment was verified and order wasn't already delivered
          if (order.paymentStatus === 'verified' && order.orderStatus !== 'delivered') {
            for (const item of order.items) {
              await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { session }
              );
            }
            logger.info(`Stock restored for cancelled order: ${id}`);
          }
        });
      } finally {
        await session.endSession();
      }
    } else {
      // Update order status normally
      updatedOrder = await Order.findByIdAndUpdate(
        id,
        { orderStatus: status },
        { new: true, runValidators: true }
      ).select('-__v');

      if (!updatedOrder) {
        logger.warn(`Order not found during update attempt: ${id}`);
        return res.status(404).json(errorResponse(404, 'Order not found'));
      }

      logger.info(`Order ${id} status updated to ${status}`);

      // Send status update email
      try {
        await sendOrderStatusUpdate(order.customerInfo.email, order, status);
        logger.info(`Status update email sent for order ${id} to ${order.customerInfo.email}`);
      } catch (emailError) {
        logger.error(`Failed to send status update email: ${emailError.message}`);
        // Don't fail the status update if email sending fails
      }
    }

    // Send response for both cancellation and normal status update
    res.status(200).json(
      successResponse(200, updatedOrder, `Order status updated to ${status}`)
    );
  } catch (error) {
    logger.error(`Error updating order status: ${error.message}`);
    res.status(500).json(errorResponse(500, 'Internal server error', 'Failed to update order status'));
  }
});

export {
  createOrder,
  getOrderByPhone,
  getAllOrders,
  verifyPayment,
  updateOrderStatus
};