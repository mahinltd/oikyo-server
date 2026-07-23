import Product from '../models/Product.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testConnection = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/oikyo';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Test query to check if we can connect and query products
    const count = await Product.countDocuments();
    console.log(`Total products in database: ${count}`);

    // Find some products with stock <= 0 or status 'out_of_stock'
    const problematicProducts = await Product.find({
      $or: [
        { stock: { $lte: 0 } },
        { status: 'out_of_stock' },
        { status: 'inactive' }
      ]
    }).limit(5);

    console.log(`Found ${problematicProducts.length} products with issues:`);
    problematicProducts.forEach(product => {
      console.log(`- ${product.name}: stock=${product.stock}, status=${product.status}`);
    });

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
};

// Check if the script is run directly (not imported)
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if this script is being run directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;

if (isMainModule) {
  testConnection();
}

export default testConnection;