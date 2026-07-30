const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue ? err.keyValue[field] : '';
  return new AppError(`Duplicate value for field "${field}": "${value}". Please use another value.`, 400);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data: ${messages.join('. ')}`, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your session has expired. Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }
  // Unknown/programming error: don't leak details
  logger.error('UNEXPECTED ERROR 💥', err);
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`${req.method} ${req.originalUrl} -> ${err.statusCode} ${err.message}`);

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, res);
  }

  let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
  error.message = err.message;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  sendErrorProd(error, res);
};