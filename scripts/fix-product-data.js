import Product from '../models/Product.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixProductData = async () => {
  try {
    console.log('Starting MongoDB connection...');
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/oikyo';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully');

    console.log('Starting product data fix...');
    
    // Find products that need to be updated based on the criteria
    const productsToUpdate = await Product.find({
      $or: [
        { stock: { $exists: false } }, 
        { stock: null }, 
        { stock: 0 },
        { status: { $type: "int" } }, // Fix integer statuses if any slipped through
        { shortDescription: { $exists: false } },
        { shortDescription: null },
        { shortDescription: "" },
        { images: { $size: 0 } } // Products with no images
      ]
    });

    console.log(`Found ${productsToUpdate.length} products to fix`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < productsToUpdate.length; i++) {
      const product = productsToUpdate[i];
      console.log(`Processing ${i + 1}/${productsToUpdate.length}: ${product.name} (${product.sourceId})`);
      
      let needsUpdate = false;
      const updateData = {};

      // Fix stock field: Check if manualOverride.stock exists, if yes use it, ELSE set default fallback: stock: 50
      if (!product.stock || product.stock === 0) {
        if (product.manualOverride && product.manualOverride.stock !== undefined && product.manualOverride.stock !== null) {
          updateData.stock = product.manualOverride.stock;
          console.log(`  - Setting stock from manualOverride: ${product.manualOverride.stock}`);
        } else {
          updateData.stock = 50; // Default fallback
          console.log(`  - Setting default stock: 50`);
        }
        needsUpdate = true;
      }

      // Fix status field: If product.status is an integer, convert to string
      if (typeof product.status === 'number') {
        updateData.status = product.status > 0 ? 'active' : 'inactive';
        console.log(`  - Converting numeric status ${product.status} to string: ${updateData.status}`);
        needsUpdate = true;
      }

      // Fix shortDescription: Generate from description if missing
      if (!product.shortDescription || product.shortDescription === '') {
        if (product.description) {
          // Remove HTML tags and generate short description
          const plainTextDescription = product.description.replace(/<[^>]*>/g, '').trim();
          const shortDesc = plainTextDescription.substring(0, 160);
          updateData.shortDescription = shortDesc;
          console.log(`  - Generated shortDescription: "${shortDesc.substring(0, 50)}..."`);
        } else {
          updateData.shortDescription = product.name.substring(0, 160);
          console.log(`  - Used product name as shortDescription: "${product.name.substring(0, 50)}..."`);
        }
        needsUpdate = true;
      }

      // Fix images: Ensure relative URLs are converted to absolute URLs if base URL is known
      if (!product.images || product.images.length === 0) {
        console.log(`  - Product has no images, keeping as is`);
      } else {
        // Check if images contain relative paths and prepend base URL if needed
        const baseUrl = 'https://mahasagar.com.bd/public/storage/';
        let updatedImages = false;
        const fixedImages = product.images.map(img => {
          if (!img.startsWith('http')) {
            updatedImages = true;
            return baseUrl + img.replace(/^\//, '');
          }
          return img;
        });
        
        if (updatedImages) {
          updateData.images = fixedImages;
          console.log(`  - Fixed relative image URLs`);
          needsUpdate = true;
        }
      }

      // Calculate discountPercentage if price and salePrice exist
      if (product.price && product.salePrice && product.salePrice < product.price && product.price > 0) {
        const discountPercentage = Math.round(((product.price - product.salePrice) / product.price) * 100);
        if (product.discountPercentage !== discountPercentage) {
          updateData.discountPercentage = discountPercentage;
          console.log(`  - Calculated discountPercentage: ${discountPercentage}%`);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await Product.findByIdAndUpdate(product._id, updateData, { new: true });
        updatedCount++;
        console.log(`  - Updated product: ${product.name} (${product.sourceId})`);
      } else {
        console.log(`  - No updates needed for: ${product.name}`);
        skippedCount++;
      }
    }

    // Alternative approach using bulk update for better performance
    console.log('\nApplying bulk updates for remaining products...');
    
    // Update products with missing short descriptions
    const shortDescUpdateResult = await Product.updateMany(
      { 
        $or: [
          { shortDescription: { $exists: false } },
          { shortDescription: null },
          { shortDescription: "" }
        ],
        description: { $exists: true, $ne: null, $ne: "" }
      },
      [
        {
          $set: {
            shortDescription: {
              $substrCP: [
                { 
                  $regexReplace: { 
                    input: { 
                      $regexReplace: { 
                        input: "$description", 
                        regex: /<[^>]*>/g, 
                        replacement: "" 
                      } 
                    }, 
                    regex: /^\s+|\s+$/g, 
                    replacement: "" 
                  } 
                },
                0,
                160
              ]
            }
          }
        }
      ]
    );
    
    console.log(`Bulk updated ${shortDescUpdateResult.modifiedCount} products with shortDescription`);

    // Update products with missing/zero stock (except those with manual overrides)
    const stockUpdateResult = await Product.updateMany(
      { 
        $and: [
          {
            $or: [
              { stock: { $exists: false } }, 
              { stock: null }, 
              { stock: 0 }
            ]
          },
          {
            $or: [
              { "manualOverride.stock": { $exists: false } },
              { "manualOverride.stock": null },
              { "manualOverride.stock": { $gte: 0 } } // Only update if manual override is not set to 0 specifically
            ]
          }
        ]
      },
      {
        $set: {
          stock: {
            $cond: {
              if: { $and: [
                { $ifNull: ["$manualOverride.stock", false] },
                { $ne: ["$manualOverride.stock", 0] }
              ]},
              then: "$manualOverride.stock",
              else: 50 // Default fallback
            }
          }
        }
      }
    );
    
    console.log(`Bulk updated ${stockUpdateResult.modifiedCount} products with stock values`);

    // Update products with integer status values to string values
    const statusUpdateResult = await Product.updateMany(
      { 
        status: { $type: "number" } // Find documents where status is a number
      },
      {
        $set: {
          status: {
            $cond: {
              if: { $gt: ["$status", 0] },
              then: "active",
              else: {
                $cond: {
                  if: { $eq: ["$status", 0] },
                  then: "inactive",
                  else: "$status"
                }
              }
            }
          }
        }
      }
    );
    
    console.log(`Bulk updated ${statusUpdateResult.modifiedCount} products with status conversion`);

    console.log(`\nMigration completed: ${updatedCount} products individually updated, ${skippedCount} products skipped`);
    console.log(`Bulk operations completed as well.`);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    
  } catch (error) {
    console.error('Error during migration:', error);
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
  console.log('Starting product data fix script...');
  fixProductData();
}

export default fixProductData;