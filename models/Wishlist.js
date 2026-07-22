import mongoose from 'mongoose';

/**
 * Wishlist Schema for User Wishlists
 * Each document represents a user's wishlist identified by email or phone
 */
const wishlistSchema = new mongoose.Schema({
  userIdentifier: {
    type: String,
    required: [true, 'User identifier is required'],
    trim: true,
    lowercase: true,
    // This can be email or phone number
    match: [
      /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$|^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid email or phone number',
    ],
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
}, {
  timestamps: true,
});

// Index for efficient lookup by user identifier
wishlistSchema.index({ userIdentifier: 1 }, { unique: true });

// Pre-save middleware to ensure unique products in the wishlist
wishlistSchema.pre('save', function(next) {
  // Remove duplicates from the products array
  if (this.products && this.products.length > 0) {
    this.products = [...new Set(this.products)];
  }
  next();
});

// Static method to add a product to wishlist
wishlistSchema.statics.addProduct = async function(userIdentifier, productId) {
  const updateOptions = { upsert: true, new: true, runValidators: true };
  
  const wishlist = await this.findOneAndUpdate(
    { userIdentifier },
    { $addToSet: { products: productId } }, // $addToSet prevents duplicates
    updateOptions
  );
  
  return wishlist;
};

// Static method to remove a product from wishlist
wishlistSchema.statics.removeProduct = async function(userIdentifier, productId) {
  const wishlist = await this.findOneAndUpdate(
    { userIdentifier },
    { $pull: { products: productId } },
    { new: true }
  );
  
  return wishlist;
};

// Static method to get a user's wishlist with populated products
wishlistSchema.statics.getWishlistWithProducts = async function(userIdentifier) {
  const wishlist = await this.findOne({ userIdentifier })
    .populate({
      path: 'products',
      select: 'name price salePrice images category stock status isFeatured',
    });
  
  return wishlist;
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;