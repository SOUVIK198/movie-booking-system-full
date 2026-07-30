/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error handling middleware via next(err), instead of needing
 * a try/catch in every controller function.
 */
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};