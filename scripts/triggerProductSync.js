import syncProductsFromMahasagar from '../services/productSyncService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const triggerSync = async () => {
  console.log('Starting manual product sync...');
  
  try {
    const result = await syncProductsFromMahasagar();
    console.log('Sync completed with result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Sync failed:', error);
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
  triggerSync();
}

export default triggerSync;