// ©2026 Oikyo Mahin Ltd develop by (Tanvir)
import mongoose from 'mongoose';

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
    sparse: true,
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
    index: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true,
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative'],
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100'],
  },
  images: [{
    type: String,
    trim: true,
  }],
  stock: {
    type: Number,
    default: 50, // CRITICAL FIX: Default fallback stock is 50
    min: [0, 'Stock cannot be negative'],
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'out_of_stock'],
      message: 'Status must be active, inactive, or out_of_stock',
    },
    default: 'active',
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  views: {
    type: Number,
    default: 0,
    index: true,
  },
  salesCount: {
    type: Number,
    default: 0,
    index: true,
  },
  attributes: {
    sizes: [{ type: String, trim: true }],
    colors: [{ type: String, trim: true }],
    variants: [{ name: String, value: String }]
  },
  manualOverride: {
    price: { type: Number },
    stock: { type: Number },
    isActive: { type: Boolean },
  },
  lastSyncedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
productSchema.index({ sourceId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ views: -1 });
productSchema.index({ salesCount: -1 });

const Product = mongoose.model('Product', productSchema);
export default Product;