import mongoose from 'mongoose';

/**
 * Review Schema for Product Reviews
 * Stores customer feedback on products with optional images
 */
const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  customerEmail: {
    type: String,
    required: [true, 'Customer email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating must be at most 5'],
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
  },
  images: [{
    type: String,
    trim: true,
  }],
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: 'Status must be pending, approved, or rejected',
    },
    default: 'pending',
  },
  verifiedPurchase: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
reviewSchema.index({ product: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ customerEmail: 1, product: 1 }); // For checking duplicate reviews

// Virtual to calculate average rating (can be used with populate)
reviewSchema.virtual('productAvgRating', {
  ref: 'Product',
  localField: 'product',
  foreignField: '_id',
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;