import mongoose from 'mongoose';

/**
 * Product Schema for Preparation of API Sync
 * This schema prepares for synchronization with external APIs like Mahasagar
 */
const productSchema = new mongoose.Schema({
  sourceId: {
    type: String,
    required: [true, 'Source ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    sparse: true, // Allows null values since existing products won't have slugs initially
    trim: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    trim: true,
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    index: true, // Added index for faster category queries
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true, // Added index for faster price range queries
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(value) {
        // If salePrice is provided, it should be less than or equal to price
        if (value !== undefined && this.price !== undefined) {
          return value <= this.price;
        }
        return true;
      },
      message: 'Sale price must be less than or equal to regular price',
    },
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100'],
  },
  images: [{
    type: String,
    trim: true,
  }],
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'out_of_stock'],
      message: 'Status must be active, inactive, or out_of_stock',
    },
    default: 'active',
    index: true, // Added index for faster status queries
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true, // Added index for faster featured queries
  },
  // Fields for future scalability
  views: {
    type: Number,
    default: 0,
    index: true, // Index for trending calculations
  },
  salesCount: {
    type: Number,
    default: 0,
    index: true, // Index for top selling calculations
  },
  // Attributes extracted from variants (sizes, colors, etc.)
  attributes: {
    sizes: [{
      type: String,
      trim: true
    }],
    colors: [{
      type: String,
      trim: true
    }],
    variants: [{
      name: String,
      value: String
    }]
  },
  manualOverride: {
    price: {
      type: Number,
      min: [0, 'Manual override price cannot be negative'],
    },
    stock: {
      type: Number,
      min: [0, 'Manual override stock cannot be negative'],
    },
    isActive: {
      type: Boolean,
    },
  },
  lastSyncedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
productSchema.index({ sourceId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 }); // Sort by newest first
productSchema.index({ name: 'text', description: 'text' }); // Text index for search
productSchema.index({ price: 1 }); // Index for price range queries
productSchema.index({ slug: 1 }); // Index for slug queries
productSchema.index({ salePrice: 1 }); // Index for deals calculation
productSchema.index({ discountPercentage: 1 }); // Index for discount sorting
productSchema.index({ views: -1 }); // Index for trending products
productSchema.index({ salesCount: -1 }); // Index for top selling products

const Product = mongoose.model('Product', productSchema);

export default Product;