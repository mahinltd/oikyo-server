/**
 * Async Handler to wrap async controller functions and catch errors
 * This eliminates the need for try-catch blocks in every async controller
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that passes errors to next()
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;