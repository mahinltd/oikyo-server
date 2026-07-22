/**
 * Utility functions for sanitizing HTML content
 */

// Regular expression to remove HTML tags and return plain text
const stripHtmlTags = (htmlString) => {
  if (!htmlString) return '';
  return htmlString.replace(/<[^>]*>/g, '');
};

// Truncate text to specified length
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + suffix;
};

// Sanitize description by stripping HTML and providing plain text summary
const sanitizeDescription = (htmlString, maxLength = 100) => {
  if (!htmlString) return '';
  
  // Strip HTML tags to get plain text
  const plainText = stripHtmlTags(htmlString);
  
  // Clean up extra whitespace
  const cleanText = plainText.replace(/\s+/g, ' ').trim();
  
  // Truncate to specified length
  return truncateText(cleanText, maxLength);
};

// Generate a short summary for list views
const generateShortDescription = (htmlString) => {
  if (!htmlString) return '';
  
  // Strip HTML tags
  const plainText = stripHtmlTags(htmlString);
  
  // Clean up extra whitespace
  const cleanText = plainText.replace(/\s+/g, ' ').trim();
  
  // Return first 50 characters or the entire string if shorter
  return cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText;
};

// Calculate discount percentage
const calculateDiscountPercentage = (originalPrice, salePrice) => {
  if (!originalPrice || !salePrice || originalPrice <= 0 || salePrice <= 0) return 0;
  if (salePrice >= originalPrice) return 0;
  
  const discount = originalPrice - salePrice;
  return Math.round((discount / originalPrice) * 100);
};

export {
  stripHtmlTags,
  truncateText,
  sanitizeDescription,
  generateShortDescription,
  calculateDiscountPercentage
};