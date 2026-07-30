const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const User = require('../models/User');

/**
 * `protect` verifies the JWT (from Authorization header or httpOnly cookie),
 * loads the user, and attaches it to req.user. Also guards against tokens
 * issued before a password change.
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (!currentUser.isActive) {
    return next(new AppError('This account has been deactivated.', 403));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('Password was recently changed. Please log in again.', 401));
  }

  req.user = currentUser;
  next();
});

/**
 * `restrictTo('admin')` guards a route to specific roles. Must run after `protect`.
 */
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };

/**
 * Optional auth: attaches req.user if a valid token is present, but never blocks
 * the request. Useful for endpoints that behave slightly differently for logged-in users
 * (e.g. showing "already reviewed" state) without requiring login.
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (currentUser && currentUser.isActive) req.user = currentUser;
  } catch (err) {
    // ignore invalid token in optional auth
  }
  next();
});