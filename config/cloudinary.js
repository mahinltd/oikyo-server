import { initializeCloudinary as initCloudinary, getCloudinary, testCloudinaryConnection } from '../utils/cloudinaryHelper.js';
import logger from './logger.js';

// Export the functions for use in other modules
export { initCloudinary as initializeCloudinary, getCloudinary };

const cloudinaryExports = {
  initializeCloudinary: initCloudinary,
  getCloudinary
};

export default cloudinaryExports;