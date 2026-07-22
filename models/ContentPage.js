import mongoose from 'mongoose';

/**
 * Content Page Schema for Dynamic Pages
 * Used for About Us, Terms, Privacy, etc.
 */
const contentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be in kebab-case format'],
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
  },
  metaDescription: {
    type: String,
    maxlength: [300, 'Meta description cannot exceed 300 characters'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: {
    updatedAt: true, // Only updatedAt since createdAt can be accessed via updatedAt
  },
});

// Index for slug uniqueness and faster lookups
contentPageSchema.index({ slug: 1 });
contentPageSchema.index({ isActive: 1 });

const ContentPage = mongoose.model('ContentPage', contentPageSchema);

export default ContentPage;