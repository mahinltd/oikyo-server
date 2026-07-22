/**
 * Standardizes API success responses
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @returns {object} Formatted response object
 */
export const successResponse = (statusCode, data, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    statusCode,
  };
};

/**
 * Standardizes API error responses
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array|Object} errors - Detailed error information (optional)
 * @returns {object} Formatted error response object
 */
export const errorResponse = (statusCode, message, errors = null) => {
  return {
    success: false,
    message,
    errors,
    statusCode,
  };
};

/**
 * Standardizes paginated API responses
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Response data
 * @param {object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {object} Formatted paginated response object
 */
export const paginatedResponse = (statusCode, data, pagination, message = 'Success') => {
  return {
    success: true,
    message,
    data,
    pagination,
    statusCode,
  };
};