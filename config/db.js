import mongoose from 'mongoose';

/**
 * Connects to MongoDB Atlas database
 * @returns {Promise<void>} Promise that resolves when connected
 */
const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB is already connected');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Event listeners for database connection
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from DB');
    });

    // Handle process termination to close DB connection
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app termination');
      process.exit(0);
    });

    // Handle nodemon restarts
    process.on('SIGUSR2', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app restart');
      process.kill(process.pid, 'SIGUSR2');
    });
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    process.exit(1);
  }
};

export default connectDB;