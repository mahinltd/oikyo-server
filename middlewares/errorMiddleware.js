import { errorResponse } from '../utils/apiResponse.js';

/**
 * Centralized error handler middleware
 * Catches all errors (including Mongoose validation errors) and returns clean JSON response
 */
const errorHandler = (err, req, res, next) => {
  console.error(err.stack); // Log error for debugging

  let error = { ...err };

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = { message };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message };
  }

  // Handle specific validation errors
  if (err.name === 'ValidatorError') {
    const message = err.message;
    error = { message };
  }

  // Set default status code and message
  const statusCode = err.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json(errorResponse(statusCode, message));
};

export default errorHandler;