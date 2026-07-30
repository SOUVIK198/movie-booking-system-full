/**
 * Custom operational error class. Anything thrown as AppError is treated
 * as a "known"/expected error by the global error handler (4xx typically),
 * as opposed to unexpected programming errors (5xx, logged with full stack).
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;