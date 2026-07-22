import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import syncProductsFromMahasagar from '../services/productSyncService.js';

/**
 * Triggers the product sync from Mahasagar API
 */
const triggerSync = asyncHandler(async (req, res) => {
  console.log('Sync triggered by admin user:', req.user.email);
  
  // Send immediate response to acknowledge the request
  res.status(200).json(successResponse(200, { message: 'Sync started in background' }, 'Product sync initiated'));

  // Process the sync asynchronously to avoid blocking the response
  process.nextTick(async () => {
    try {
      console.log('Starting background sync process...');
      const result = await syncProductsFromMahasagar();
      console.log('Background sync completed:', result.message);
    } catch (error) {
      console.error('Background sync failed:', error.message);
    }
  });
});

export { triggerSync };