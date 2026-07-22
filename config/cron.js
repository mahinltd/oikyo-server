import cron from 'node-cron';
import syncProductsFromMahasagar from '../services/productSyncService.js';

let isSyncRunning = false;

/**
 * Initializes the cron job for automatic product sync
 */
const initializeCronJobs = () => {
  console.log('Initializing cron jobs...');

  // Schedule product sync every 6 hours
  // The cron expression "0 */6 * * *" means every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log(`Scheduled product sync started at ${new Date().toISOString()}`);

    // Prevent multiple simultaneous syncs
    if (isSyncRunning) {
      console.log('Previous sync still running, skipping this cycle');
      return;
    }

    isSyncRunning = true;

    try {
      console.log('Starting scheduled product sync...');
      const result = await syncProductsFromMahasagar();
      console.log(`Scheduled sync completed: ${result.message}`);
    } catch (error) {
      console.error('Error during scheduled product sync:', error.message);
    } finally {
      isSyncRunning = false;
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Dhaka' // Set to Bangladesh timezone
  });

  console.log('Cron jobs initialized successfully');
  console.log('Product sync scheduled to run every 6 hours');
};

export default initializeCronJobs;