import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

console.log('Environment variables check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CLOUDINARY_CLOUD_NAME exists:', !!process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY exists:', !!process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET);
console.log('FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
console.log('FIREBASE_SERVICE_ACCOUNT_KEY length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length : 'undefined');
console.log('FIREBASE_PROJECT_ID exists:', !!process.env.FIREBASE_PROJECT_ID);

// Log the actual values to see if they're loaded correctly
console.log('CLOUDINARY_CLOUD_NAME value:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('FIREBASE_PROJECT_ID value:', process.env.FIREBASE_PROJECT_ID);

// Check the format of the Firebase service account key
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  console.log('Raw FIREBASE_SERVICE_ACCOUNT_KEY type:', typeof rawKey);
  console.log('Raw FIREBASE_SERVICE_ACCOUNT_KEY starts with:', rawKey.substring(0, 2));
  console.log('Raw FIREBASE_SERVICE_ACCOUNT_KEY ends with:', rawKey.substring(rawKey.length - 2));
  
  // Try to parse it
  try {
    const parsed = JSON.parse(rawKey);
    console.log('JSON parsing successful!');
    console.log('Parsed project_id:', parsed.project_id);
  } catch (e) {
    console.log('JSON parsing failed:', e.message);
    console.log('Raw value preview:', rawKey.substring(0, 100) + '...');
  }
}