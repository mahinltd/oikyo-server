import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

dotenv.config();

const createIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/oikyo');

    logger.info('Connected to MongoDB, creating indexes...');

    // Product indexes
    await Product.syncIndexes();
    logger.info('Product indexes created/updated');

    // Order indexes
    await Order.syncIndexes();
    logger.info('Order indexes created/updated');

    // User indexes
    await User.syncIndexes();
    logger.info('User indexes created/updated');

    logger.info('All indexes created successfully!');
    
    // Close connection
    await mongoose.connection.close();
  } catch (error) {
    logger.error(`Error creating indexes: ${error.message}`);
    process.exit(1);
  }
};

// Check if this script is being run directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only run if this file is executed directly
if (process.argv[1] === __filename) {
  createIndexes();
}

export default createIndexes;