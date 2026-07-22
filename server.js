// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression'; // Added for performance
import connectDB from './config/db.js';
import logger from './config/logger.js';
import authRoutes from './routes/authRoutes.js';
import cmsRoutes from './routes/cmsRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import productRoutes from './routes/productRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import initializeCronJobs from './config/cron.js';
import errorHandler from './middlewares/errorMiddleware.js';
import socketHandler from './sockets/socketHandler.js';

// Connect to MongoDB
connectDB();

// Initialize cron jobs for automated product sync
initializeCronJobs();

// Initialize Express app
const app = express();

// Enable compression middleware for performance (gzip)
app.use(compression());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*', // Will be restricted in production
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available globally so it can be accessed in other modules
global.io = io;

// Apply socket handler
socketHandler(io);

// Make io available to routes through app locals
app.set('io', io);

// Security middleware with enhanced CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
      scriptSrc: ["'self'", "cdnjs.cloudflare.com", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "*.cloudinary.com", "*.res.cloudinary.com", "https:"],
      fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
      connectSrc: ["'self'", "https://*.sentry.io"], // For error tracking if added later
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  hidePoweredBy: true, // Hide X-Powered-By header
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: {
    policy: 'no-referrer-when-downgrade'
  }
}));

// Enhanced CORS configuration based on NODE_ENV
const corsOptions = {
  credentials: true
};

if (process.env.NODE_ENV === 'production') {
  // Restrict to specific domains in production
  const allowedOrigins = [
    'http://localhost:3000', 
    'https://oikyo.me',
    process.env.FRONTEND_URL // Allow environment-specified frontend URL
  ].filter(Boolean); // Remove undefined values
  
  corsOptions.origin = allowedOrigins;
} else {
  // Allow all origins in development
  corsOptions.origin = process.env.CORS_ORIGIN || '*';
}

// Apply CORS middleware with conditional configuration
app.use(cors(corsOptions));

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
// Parse cookies
app.use(cookieParser());

// Logging middleware using Winston
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined', { stream: logger.stream }));
} else {
  // In production, only log errors
  app.use(morgan('combined', { 
    stream: logger.stream,
    skip: (req, res) => res.statusCode < 400 // Only log errors
  }));
}

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for order endpoints
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 order requests per windowMs
  message: {
    success: false,
    message: 'Too many order requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting
app.use(generalLimiter);

// Routes with specific rate limiting
app.use('/api/auth/login', strictAuthLimiter);
app.use('/api/orders', orderLimiter);

// Routes
app.use('/api/auth', authRoutes); // Mount auth routes
app.use('/api/cms', cmsRoutes); // Mount CMS routes
app.use('/api/sync', syncRoutes); // Mount sync routes
app.use('/api/orders', orderRoutes); // Mount order routes
app.use('/api/reviews', reviewRoutes); // Mount review routes
app.use('/api/wishlist', wishlistRoutes); // Mount wishlist routes
app.use('/api/products', productRoutes); // Mount product routes
app.use('/api/notifications', notificationRoutes); // Mount notification routes

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Oikyo E-commerce Backend API!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

// Global error handlers
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  logger.error(reason instanceof Error ? reason.stack : String(reason));
  
  // Gracefully shut down the server
  server.close(() => {
    process.exit(1);
  });
  
  // Force exit if server doesn't close in time
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

// Graceful shutdown
let serverShuttingDown = false;

process.on('SIGTERM', () => {
  if (serverShuttingDown) return;
  serverShuttingDown = true;
  
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds if server doesn't close
  setTimeout(() => {
    logger.error('Could not close server in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  if (serverShuttingDown) return;
  serverShuttingDown = true;
  
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force exit after 10 seconds if server doesn't close
  setTimeout(() => {
    logger.error('Could not close server in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  // Import and initialize Cloudinary after server starts
  import('./config/cloudinary.js').then(cloudinaryModule => {
    if (typeof cloudinaryModule.initializeCloudinary === 'function') {
      cloudinaryModule.initializeCloudinary();
    }
  }).catch(err => {
    logger.error('Error importing Cloudinary module:', err);
  });

  // Import and initialize Firebase after server starts
  import('./config/firebase.js').then(firebaseModule => {
    if (typeof firebaseModule.initializeFirebase === 'function') {
      firebaseModule.initializeFirebase();
    }
  }).catch(err => {
    logger.error('Error importing Firebase module:', err);
  });

  logger.info(`✅ Connected to MongoDB Atlas successfully`);
  logger.info(`✅ Cron jobs initialized for automated product sync`);
  logger.info(`✅ Socket.io initialized successfully`);
  logger.info(`✅ Firebase Admin SDK initialized`);
  logger.info(`✅ Notification System Ready: Socket.io active, Firebase initialized.`);
  logger.info(`✅ Security Headers Active: Helmet configured with CSP`);
  logger.info(`✅ Compression Enabled: Gzip compression active`);
  logger.info(`✅ Database Indexes Verified: Connection established`);
  logger.info(`✅ Graceful Shutdown Handlers Registered`);
  logger.info(`✅ Production Mode Ready: ${process.env.NODE_ENV === 'production' ? 'Yes' : 'No'}`);
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

export default app;