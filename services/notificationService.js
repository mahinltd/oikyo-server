import { admin } from '../config/firebase.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { sendOrderConfirmation, sendPaymentVerificationSuccess, sendPaymentVerificationFailed } from './emailService.js';
import logger from '../config/logger.js';

class NotificationService {
  /**
   * Send order notification via email, push, and socket
   */
  static async sendOrderNotification(orderData) {
    try {
      // Prepare notification data
      const title = 'New Order Received';
      const message = `New order #${orderData._id} placed by ${orderData.customerInfo.name} for ${orderData.totalAmount}`;
      
      // Get all admin users
      const admins = await User.find({ role: 'admin', isActive: true });
      
      // Send notifications to each admin
      for (const adminUser of admins) {
        // Create notification record
        await Notification.create({
          userId: adminUser._id,
          type: 'order',
          title,
          message,
          data: { orderId: orderData._id, customerInfo: orderData.customerInfo }
        });

        // Send push notification if admin has FCM tokens
        if (adminUser.fcmTokens && adminUser.fcmTokens.length > 0) {
          try {
            const payload = {
              notification: {
                title,
                body: message,
                icon: '/favicon.ico'
              },
              data: {
                type: 'order',
                orderId: orderData._id.toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            };

            await admin.messaging().sendMulticast({
              tokens: adminUser.fcmTokens,
              ...payload
            });
          } catch (pushError) {
            logger.error('Error sending push notification for order:', pushError.message);
          }
        }
      }

      // Emit socket event to admin room
      const io = global.io || (require.main.exports && require.main.exports.io);
      if (io) {
        io.to('admin_room').emit('new_order', {
          orderId: orderData._id,
          customerName: orderData.customerInfo.name,
          totalAmount: orderData.totalAmount,
          timestamp: new Date()
        });
      }

      logger.info(`Order notification sent for order: ${orderData._id}`);
    } catch (error) {
      logger.error('Error sending order notification:', error.message);
    }
  }

  /**
   * Send payment verification notification
   */
  static async sendPaymentVerificationNotification(orderData, action, reason = null) {
    try {
      let title, message;
      
      if (action === 'approve') {
        title = 'Payment Verified';
        message = `Payment for order #${orderData._id} has been verified successfully`;
      } else if (action === 'reject') {
        title = 'Payment Verification Failed';
        message = `Payment for order #${orderData._id} has been rejected. Reason: ${reason || 'Not specified'}`;
      } else {
        return;
      }

      // Get all admin users
      const admins = await User.find({ role: 'admin', isActive: true });
      
      // Send notifications to each admin
      for (const adminUser of admins) {
        // Create notification record
        await Notification.create({
          userId: adminUser._id,
          type: 'payment',
          title,
          message,
          data: { 
            orderId: orderData._id, 
            action, 
            reason,
            customerInfo: orderData.customerInfo 
          }
        });

        // Send push notification if admin has FCM tokens
        if (adminUser.fcmTokens && adminUser.fcmTokens.length > 0) {
          try {
            const payload = {
              notification: {
                title,
                body: message,
                icon: '/favicon.ico'
              },
              data: {
                type: 'payment',
                orderId: orderData._id.toString(),
                action,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            };

            await admin.messaging().sendMulticast({
              tokens: adminUser.fcmTokens,
              ...payload
            });
          } catch (pushError) {
            logger.error('Error sending push notification for payment verification:', pushError.message);
          }
        }
      }

      // Emit socket event to admin room
      const io = global.io || (require.main.exports && require.main.exports.io);
      if (io) {
        io.to('admin_room').emit('payment_verified', {
          orderId: orderData._id,
          action,
          customerName: orderData.customerInfo.name,
          totalAmount: orderData.totalAmount,
          timestamp: new Date()
        });
      }

      logger.info(`Payment verification notification sent for order: ${orderData._id}, action: ${action}`);
    } catch (error) {
      logger.error('Error sending payment verification notification:', error.message);
    }
  }

  /**
   * Send review notification
   */
  static async sendReviewNotification(reviewData) {
    try {
      const product = await reviewData.populate('product');
      const productName = product.product?.name || 'Unknown Product';
      
      const title = 'New Review Pending Approval';
      const message = `New review for "${productName}" is pending approval. Rating: ${reviewData.rating}/5`;

      // Get all admin users
      const admins = await User.find({ role: 'admin', isActive: true });
      
      // Send notifications to each admin
      for (const adminUser of admins) {
        // Create notification record
        await Notification.create({
          userId: adminUser._id,
          type: 'review',
          title,
          message,
          data: { 
            reviewId: reviewData._id, 
            productId: reviewData.product,
            productName,
            rating: reviewData.rating,
            customerName: reviewData.customerName
          }
        });

        // Send push notification if admin has FCM tokens
        if (adminUser.fcmTokens && adminUser.fcmTokens.length > 0) {
          try {
            const payload = {
              notification: {
                title,
                body: message,
                icon: '/favicon.ico'
              },
              data: {
                type: 'review',
                reviewId: reviewData._id.toString(),
                productId: reviewData.product.toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            };

            await admin.messaging().sendMulticast({
              tokens: adminUser.fcmTokens,
              ...payload
            });
          } catch (pushError) {
            logger.error('Error sending push notification for review:', pushError.message);
          }
        }
      }

      // Emit socket event to admin room
      const io = global.io || (require.main.exports && require.main.exports.io);
      if (io) {
        io.to('admin_room').emit('new_review', {
          reviewId: reviewData._id,
          productName,
          rating: reviewData.rating,
          customerName: reviewData.customerName,
          timestamp: new Date()
        });
      }

      logger.info(`Review notification sent for review: ${reviewData._id}`);
    } catch (error) {
      logger.error('Error sending review notification:', error.message);
    }
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(productData) {
    try {
      const title = 'Low Stock Alert';
      const message = `Product "${productData.name}" has low stock (${productData.stock} remaining)`;

      // Get all admin users
      const admins = await User.find({ role: 'admin', isActive: true });
      
      // Send notifications to each admin
      for (const adminUser of admins) {
        // Create notification record
        await Notification.create({
          userId: adminUser._id,
          type: 'low_stock',
          title,
          message,
          data: { 
            productId: productData._id, 
            productName: productData.name,
            stock: productData.stock
          }
        });

        // Send push notification if admin has FCM tokens
        if (adminUser.fcmTokens && adminUser.fcmTokens.length > 0) {
          try {
            const payload = {
              notification: {
                title,
                body: message,
                icon: '/favicon.ico'
              },
              data: {
                type: 'low_stock',
                productId: productData._id.toString(),
                stock: productData.stock.toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            };

            await admin.messaging().sendMulticast({
              tokens: adminUser.fcmTokens,
              ...payload
            });
          } catch (pushError) {
            logger.error('Error sending push notification for low stock:', pushError.message);
          }
        }
      }

      // Emit socket event to admin room
      const io = global.io || (require.main.exports && require.main.exports.io);
      if (io) {
        io.to('admin_room').emit('low_stock_alert', {
          productId: productData._id,
          productName: productData.name,
          stock: productData.stock,
          timestamp: new Date()
        });
      }

      logger.info(`Low stock alert sent for product: ${productData.name} (ID: ${productData._id})`);
    } catch (error) {
      logger.error('Error sending low stock alert:', error.message);
    }
  }

  /**
   * Send system notification
   */
  static async sendSystemNotification(userId, title, message, data = {}) {
    try {
      // Create notification record
      await Notification.create({
        userId,
        type: 'system',
        title,
        message,
        data
      });

      // Get user to send push notification
      const user = await User.findById(userId);
      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        try {
          const payload = {
            notification: {
              title,
              body: message,
              icon: '/favicon.ico'
            },
            data: {
              type: 'system',
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
              ...data
            }
          };

          await admin.messaging().sendMulticast({
            tokens: user.fcmTokens,
            ...payload
          });
        } catch (pushError) {
          logger.error('Error sending system push notification:', pushError.message);
        }
      }

      // Emit socket event to user's room (if applicable)
      const io = global.io || (require.main.exports && require.main.exports.io);
      if (io) {
        io.to(`user_${userId}`).emit('system_notification', {
          title,
          message,
          data,
          timestamp: new Date()
        });
      }

      logger.info(`System notification sent to user: ${userId}`);
    } catch (error) {
      logger.error('Error sending system notification:', error.message);
    }
  }
}

export default NotificationService;