import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import logger from '../config/logger.js';

const socketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      // Extract token from handshake auth
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user in database
      const user = await User.findById(decoded.id);
      if (!user || user.role !== 'admin') {
        return next(new Error('Unauthorized: Admin access required'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error.message);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} for user: ${socket.user.email}`);

    // Join admin room
    socket.join('admin_room');
    
    // Emit connection confirmation
    socket.emit('connected', { 
      message: 'Connected to admin notification channel',
      userId: socket.user._id,
      userEmail: socket.user.email 
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle custom events if needed
    socket.on('subscribe_admin_updates', () => {
      logger.info(`User ${socket.user.email} subscribed to admin updates`);
    });
  });
};

export default socketHandler;