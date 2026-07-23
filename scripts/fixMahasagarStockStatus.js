import Product from '../models/Product.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const updateExistingProducts = async () => {
  try {
    console.log('🚀 Starting MongoDB connection...');
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/oikyo';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully');

    console.log('🔄 Starting product stock and status update...');

    // Find products that need to be updated (stock <= 0 or status is out_of_stock)
    // But exclude those with manual overrides
    console.log('🔍 Querying products with issues...');
    const productsToUpdate = await Product.find({
      $or: [
        { stock: { $lte: 0 } },
        { status: 'out_of_stock' },
        { status: 'inactive' } // Also update inactive products that aren't manually overridden
      ]
    });

    console.log(`📊 Found ${productsToUpdate.length} products to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < productsToUpdate.length; i++) {
      const product = productsToUpdate[i];
      console.log(`\n📦 Processing ${i + 1}/${productsToUpdate.length}: ${product.name} (${product.sourceId})`);
      
      let needsUpdate = false;
      const updateData = {};

      // Check if product has manual override for stock or isActive
      if (product.manualOverride) {
        // If manual override is set for stock or isActive, skip this product
        if (product.manualOverride.stock !== undefined || product.manualOverride.stock !== null ||
            product.manualOverride.isActive !== undefined || product.manualOverride.isActive !== null) {
          console.log(`🚫 Skipping product ${product.name} (${product.sourceId}) due to manual override`);
          skippedCount++;
          continue;
        }
      }

      // Update stock if it's <= 0
      if (product.stock <= 0) {
        updateData.stock = 50;
        needsUpdate = true;
        console.log(`  ➕ Updating stock from ${product.stock} to 50`);
      }

      // Update status if it's 'out_of_stock' or 'inactive'
      if (product.status === 'out_of_stock' || product.status === 'inactive') {
        updateData.status = 'active';
        needsUpdate = true;
        console.log(`  ➕ Updating status from ${product.status} to 'active'`);
      }

      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updateData, { new: true });
        updatedCount++;
        console.log(`  ✅ Updated product: ${product.name} (${product.sourceId})`);
      } else {
        console.log(`  ❌ No updates needed for: ${product.name}`);
      }
    }

    console.log(`\n🎉 Migration completed: ${updatedCount} products updated, ${skippedCount} products skipped`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🛑 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
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
  console.log('🎬 Script started...');
  updateExistingProducts();
}

export default updateExistingProducts;