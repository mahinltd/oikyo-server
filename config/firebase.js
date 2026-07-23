import admin from 'firebase-admin';
import logger from './logger.js';

let firebaseInitialized = false;

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  if (firebaseInitialized) {
    return admin.app();
  }

  try {
    // Parse the Firebase service account key from environment variables
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // If it's a string, parse it as JSON
      let rawValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      try {
        serviceAccount = JSON.parse(rawValue);
      } catch (parseError) {
        logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
        logger.error('Raw value preview:', rawValue.substring(0, 100) + '...');
        return null;
      }
    } else {
      logger.warn('FIREBASE_SERVICE_ACCOUNT_KEY not found in environment variables');
      return null;
    }

    // Initialize Firebase Admin
    // First check if initialization is needed by seeing if default app already exists
    let app;
    try {
      app = admin.app();
      // If we reach here, default app already exists
    } catch (noAppError) {
      // No default app exists, so initialize
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    firebaseInitialized = true;
    logger.info('✅ Firebase Admin SDK initialized successfully');
    return app;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK:', error.message);
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } else {
      logger.error('Error details:', error);
    }
    return null;
  }
};

// Only initialize if environment variables are available
// Otherwise, return a function that can be called later
const firebaseApp = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? initializeFirebase() : null;

export default firebaseApp;
export { admin, initializeFirebase };