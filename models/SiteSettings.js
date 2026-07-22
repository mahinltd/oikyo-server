import mongoose from 'mongoose';

/**
 * Site Settings Schema for Global Configurations
 * This collection holds only ONE document containing global site settings
 */
const siteSettingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: [true, 'Site name is required'],
    trim: true,
  },
  logoUrl: {
    type: String,
    trim: true,
  },
  faviconUrl: {
    type: String,
    trim: true,
  },
  contactEmail: {
    type: String,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
    trim: true,
  },
  contactPhone: {
    type: String,
    trim: true,
  },
  socialLinks: {
    facebook: {
      type: String,
      trim: true,
    },
    instagram: {
      type: String,
      trim: true,
    },
    tiktok: {
      type: String,
      trim: true,
    },
    twitter: {
      type: String,
      trim: true,
    },
  },
  pixelIds: {
    googleAnalytics: {
      type: String,
      trim: true,
    },
    facebookPixel: {
      type: String,
      trim: true,
    },
    tiktokPixel: {
      type: String,
      trim: true,
    },
  },
  currencySymbol: {
    type: String,
    default: '৳',
    trim: true,
  },
  shippingPolicyText: {
    type: String,
  },
  returnPolicyText: {
    type: String,
  },
}, {
  timestamps: true,
});

// Pre-save hook to ensure only one document exists in the collection
siteSettingsSchema.pre('save', async function(next) {
  // Count documents in the collection
  const count = await this.constructor.countDocuments();
  
  // If there are already documents and this is a new document, throw an error
  if (count > 0 && this.isNew) {
    throw new Error('Only one site settings document is allowed');
  }
  
  next();
});

// Static method to get the single settings document
siteSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      siteName: 'Oikyo E-commerce',
      currencySymbol: '৳',
    });
  }
  return settings;
};

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;