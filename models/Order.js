import mongoose from 'mongoose';

/**
 * Order Schema for E-commerce Order Management
 * Supports complete order lifecycle: placement, payment verification, status updates
 */
const orderSchema = new mongoose.Schema({
  customerInfo: {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Customer phone is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Customer email is required'],
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
    },
    address: {
      type: String,
      required: [true, 'Customer address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    zip: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
    },
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    priceAtPurchase: {
      type: Number,
      required: [true, 'Price at purchase is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      trim: true,
    },
  }],
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['bkash', 'nagad', 'rocket', 'cod'],
      message: 'Payment method must be bkash, nagad, rocket, or cod',
    },
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters'],
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'verified', 'rejected'],
      message: 'Payment status must be pending, verified, or rejected',
    },
    default: 'pending',
  },
  orderStatus: {
    type: String,
    enum: {
      values: ['pending_payment', 'processing', 'shipped', 'delivered', 'cancelled'],
      message: 'Order status must be pending_payment, processing, shipped, delivered, or cancelled',
    },
    default: 'pending_payment',
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
orderSchema.index({ 'customerInfo.phone': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 }); // Sort by newest first

const Order = mongoose.model('Order', orderSchema);

export default Order;