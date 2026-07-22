import mongoose from 'mongoose';

/**
 * Banner Schema for Homepage Sliders
 * Used for promotional banners on the homepage
 */
const bannerSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true,
  },
  linkUrl: {
    type: String,
    trim: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters'],
  },
  orderIndex: {
    type: Number,
    default: 0,
    min: [0, 'Order index cannot be negative'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: {
    createdAt: true, // Only createdAt for banners
  },
});

// Index for active banners and ordering
bannerSchema.index({ isActive: 1, orderIndex: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;