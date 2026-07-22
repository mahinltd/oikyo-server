import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define critical environment variables
const CRITICAL_VARIABLES = [
  { key: 'MONGODB_URI', description: 'MongoDB connection string', critical: true },
  { key: 'JWT_SECRET', description: 'JWT secret for authentication', critical: true },
  { key: 'RESEND_API_KEY', description: 'Resend API key for email service', critical: false },
  { key: 'MAHASAGAR_API_KEY', description: 'Mahasagar API key for product sync', critical: false },
  { key: 'CLOUDINARY_API_KEY', description: 'Cloudinary API key for image upload', critical: false },
  { key: 'CLOUDINARY_API_SECRET', description: 'Cloudinary API secret for image upload', critical: false },
];

// Check environment variables
const missingVariables = [];
const presentVariables = [];

for (const variable of CRITICAL_VARIABLES) {
  if (process.env[variable.key]) {
    presentVariables.push(variable);
  } else {
    missingVariables.push(variable);
  }
}

// Print results
console.log('\n🔧 Environment Variable Check\n');

// Print present variables
console.log('✅ Present variables:');
for (const variable of presentVariables) {
  console.log(`   - ${variable.key}: ✓`);
}

console.log('');

// Print missing variables
if (missingVariables.length > 0) {
  console.log('❌ Missing variables:');
  for (const variable of missingVariables) {
    if (variable.critical) {
      console.log(`   - ⚠️ CRITICAL: ${variable.key} is missing. ${variable.description} This will cause the server to fail.`);
    } else {
      console.log(`   - 📧 Optional: ${variable.key} is missing. ${variable.description} This feature will be disabled.`);
    }
  }
} else {
  console.log('✅ All required environment variables are present.');
}

// Print summary
console.log(`\n📊 Summary: ${presentVariables.length} present, ${missingVariables.length} missing\n`);

// Check if critical variables are missing
const missingCritical = missingVariables.filter(v => v.critical);
if (missingCritical.length > 0) {
  console.log('💥 CRITICAL ERROR: The following critical variables are missing:');
  for (const variable of missingCritical) {
    console.log(`   - ${variable.key}`);
  }
  console.log('\nPlease add these variables to your .env file before starting the server.\n');
  process.exit(1);
} else {
  console.log('✅ Server can start safely with current configuration.');
}

export default { missingVariables, presentVariables };