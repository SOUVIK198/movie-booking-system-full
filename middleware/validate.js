const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Runs after an array of express-validator checks in a route definition.
 * Collects all validation errors and forwards a single 400 AppError.
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`);
    return next(new AppError(messages.join(', '), 400));
  }
  next();
};