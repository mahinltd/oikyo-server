import { Resend } from 'resend';
import SiteSettings from '../models/SiteSettings.js';

// Initialize Resend client
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

/**
 * Sends order confirmation email to customer
 * @param {string} email - Customer email
 * @param {object} orderDetails - Order details
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderConfirmation = async (email, orderDetails) => {
  try {
    // Check if resend is properly initialized
    if (!resend) {
      console.error('Resend client not initialized. Missing RESEND_API_KEY in environment variables.');
      return false;
    }
    
    // Get site settings for email customization
    const siteSettings = await SiteSettings.getSettings();
    
    const subject = `Order Confirmation - Order #${orderDetails._id}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Order Confirmation</h2>
            <p>Dear ${orderDetails.customerInfo.name},</p>
            <p>Thank you for your order! Your order has been received and is awaiting payment verification.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${orderDetails._id}</p>
              <p><strong>Total Amount:</strong> ${siteSettings.currencySymbol || '৳'}${orderDetails.totalAmount.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> ${orderDetails.paymentMethod.toUpperCase()}</p>
              ${orderDetails.transactionId ? `<p><strong>Transaction ID:</strong> ${orderDetails.transactionId}</p>` : ''}
            </div>
            
            <div style="margin: 20px 0;">
              <h3>Items Ordered:</h3>
              <ul>
                ${orderDetails.items.map(item => `
                  <li>
                    <strong>${item.productName}</strong> - Quantity: ${item.quantity} - Price: ${siteSettings.currencySymbol || '৳'}${item.priceAtPurchase.toFixed(2)}
                  </li>
                `).join('')}
              </ul>
            </div>
            
            ${orderDetails.paymentMethod !== 'cod' ? `
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0;">
              <h4>Payment Instructions:</h4>
              <p>Please complete your payment by sending the amount to our ${orderDetails.paymentMethod.toUpperCase()} account.</p>
              <p>Once payment is made, our team will verify the transaction and update your order status.</p>
            </div>
            ` : ''}
            
            <p>You can track your order status using your phone number on our website.</p>
            
            <hr style="margin: 30px 0;" />
            <p>Best regards,<br/>${siteSettings.siteName || 'Oikyo E-commerce'}</p>
          </div>
        </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: subject,
      html: html,
    });

    console.log('Order confirmation email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error.message);
    return false;
  }
};

/**
 * Sends payment verification success email to customer
 * @param {string} email - Customer email
 * @param {object} orderDetails - Order details
 * @returns {Promise<boolean>} - Success status
 */
const sendPaymentVerificationSuccess = async (email, orderDetails) => {
  try {
    // Check if resend is properly initialized
    if (!resend) {
      console.error('Resend client not initialized. Missing RESEND_API_KEY in environment variables.');
      return false;
    }
    
    const siteSettings = await SiteSettings.getSettings();
    
    const subject = `Payment Verified - Order #${orderDetails._id}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Payment Verified</h2>
            <p>Dear ${orderDetails.customerInfo.name},</p>
            <p>Your payment has been successfully verified. Your order is now being processed.</p>
            
            <div style="background-color: #d4edda; color: #155724; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Order ID:</strong> ${orderDetails._id}</p>
              <p><strong>Status:</strong> Processing</p>
              <p><strong>Total Amount:</strong> ${siteSettings.currencySymbol || '৳'}${orderDetails.totalAmount.toFixed(2)}</p>
            </div>
            
            <p>Our team is preparing your order. You will receive another update when your order is shipped.</p>
            
            <hr style="margin: 30px 0;" />
            <p>Best regards,<br/>${siteSettings.siteName || 'Oikyo E-commerce'}</p>
          </div>
        </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: subject,
      html: html,
    });

    console.log('Payment verification success email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending payment verification success email:', error.message);
    return false;
  }
};

/**
 * Sends payment verification failed email to customer
 * @param {string} email - Customer email
 * @param {string} reason - Reason for rejection
 * @param {object} orderDetails - Order details
 * @returns {Promise<boolean>} - Success status
 */
const sendPaymentVerificationFailed = async (email, reason, orderDetails) => {
  try {
    // Check if resend is properly initialized
    if (!resend) {
      console.error('Resend client not initialized. Missing RESEND_API_KEY in environment variables.');
      return false;
    }
    
    const siteSettings = await SiteSettings.getSettings();
    
    const subject = `Payment Verification Failed - Order #${orderDetails._id}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #721c24;">Payment Verification Failed</h2>
            <p>Dear ${orderDetails.customerInfo.name},</p>
            <p>We regret to inform you that your payment could not be verified. Your order has been cancelled.</p>
            
            <div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Order ID:</strong> ${orderDetails._id}</p>
              <p><strong>Reason:</strong> ${reason || 'Payment verification failed'}</p>
              <p><strong>Status:</strong> Cancelled</p>
            </div>
            
            <p>If you believe this is an error, please contact our support team.</p>
            
            <hr style="margin: 30px 0;" />
            <p>Best regards,<br/>${siteSettings.siteName || 'Oikyo E-commerce'}</p>
          </div>
        </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: subject,
      html: html,
    });

    console.log('Payment verification failed email sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending payment verification failed email:', error.message);
    return false;
  }
};

/**
 * Sends order status update email to customer
 * @param {string} email - Customer email
 * @param {object} orderDetails - Order details
 * @param {string} status - New status
 * @returns {Promise<boolean>} - Success status
 */
const sendOrderStatusUpdate = async (email, orderDetails, status) => {
  try {
    // Check if resend is properly initialized
    if (!resend) {
      console.error('Resend client not initialized. Missing RESEND_API_KEY in environment variables.');
      return false;
    }
    
    const siteSettings = await SiteSettings.getSettings();
    
    // Define status messages
    const statusMessages = {
      processing: 'Your order is now being processed.',
      shipped: 'Your order has been shipped and is on its way to you.',
      delivered: 'Your order has been delivered successfully.',
      cancelled: 'Your order has been cancelled.'
    };
    
    const statusTitles = {
      processing: 'Order Processing',
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled'
    };
    
    const subject = `${statusTitles[status]} - Order #${orderDetails._id}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${statusTitles[status]}</h2>
            <p>Dear ${orderDetails.customerInfo.name},</p>
            <p>${statusMessages[status]}</p>
            
            <div style="background-color: #f0f8ff; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff;">
              <p><strong>Order ID:</strong> ${orderDetails._id}</p>
              <p><strong>New Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
              <p><strong>Total Amount:</strong> ${siteSettings.currencySymbol || '৳'}${orderDetails.totalAmount.toFixed(2)}</p>
            </div>
            
            ${status === 'shipped' ? `
            <p>If you have any questions about your shipment, please contact our support team.</p>
            ` : ''}
            
            <hr style="margin: 30px 0;" />
            <p>Best regards,<br/>${siteSettings.siteName || 'Oikyo E-commerce'}</p>
          </div>
        </body>
      </html>
    `;

    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email,
      subject: subject,
      html: html,
    });

    console.log(`Order status update email sent successfully for status ${status}:`, data);
    return true;
  } catch (error) {
    console.error(`Error sending order status update email for status ${status}:`, error.message);
    return false;
  }
};

export {
  sendOrderConfirmation,
  sendPaymentVerificationSuccess,
  sendPaymentVerificationFailed,
  sendOrderStatusUpdate
};