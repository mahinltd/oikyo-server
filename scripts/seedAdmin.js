import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

/**
 * Seeds the database with a default super admin user if none exists
 */
const seedAdmin = async () => {
  try {
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB for seeding');
    }

    // Check if an admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      console.log(`Existing admin email: ${existingAdmin.email}`);
      
      // Close the connection and exit
      await mongoose.connection.close();
      return;
    }

    // Create default super admin user
    const defaultEmail = process.env.ADMIN_EMAIL || 'admin@oikyo.me';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const adminUser = new User({
      name: 'Super Admin',
      email: defaultEmail,
      password: hashedPassword,
      role: 'admin',
      isActive: true,
    });

    await adminUser.save();
    
    console.log('✅ Super Admin created successfully!');
    console.log(`Email: ${defaultEmail}`);
    console.log(`Password: ${defaultPassword} (Please change after first login)`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

// Execute the seed function
seedAdmin();