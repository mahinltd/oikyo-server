import cloudinary from 'cloudinary';
import logger from '../config/logger.js';

let cloudinaryInstance = null;
let cloudinaryConfigured = false;

/**
 * Initialize Cloudinary with environment variables
 * This should be called after dotenv.config() has run
 */
const initializeCloudinary = () => {
  if (cloudinaryConfigured) {
    return cloudinaryInstance;
  }

  // Check if all required environment variables are present
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.');
    cloudinaryConfigured = true; // Mark as attempted to avoid repeated warnings
    return null;
  }

  try {
    // Configure Cloudinary
    cloudinary.v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    cloudinaryInstance = cloudinary.v2;
    cloudinaryConfigured = true;
    logger.info('✅ Cloudinary configured successfully');
    return cloudinaryInstance;
  } catch (error) {
    logger.error('Failed to configure Cloudinary:', error.message || String(error));
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      logger.error('Error details:', error);
    }
    cloudinaryConfigured = true; // Mark as attempted to avoid repeated warnings
    return null;
  }
};

/**
 * Get Cloudinary instance, initializing if needed
 */
const getCloudinary = () => {
  if (!cloudinaryInstance) {
    return initializeCloudinary();
  }
  return cloudinaryInstance;
};

/**
 * Test Cloudinary connection
 */
const testCloudinaryConnection = async () => {
  try {
    const cloudinaryInst = getCloudinary();
    if (!cloudinaryInst) {
      return false;
    }
    
    // Using a simple API call to test connection
    const result = await cloudinaryInst.api.ping();
    logger.info('✅ Connected to Cloudinary successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Cloudinary:', error.message || String(error));
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      logger.error('Error details:', error);
    }
    return false;
  }
};

export { initializeCloudinary, getCloudinary, testCloudinaryConnection };