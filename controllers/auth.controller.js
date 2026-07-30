const crypto = require('crypto');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { createSendToken } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('An account with this email already exists.', 400));

  const user = await User.create({ name, email, password, phone });

  sendEmail({
    to: user.email,
    subject: 'Welcome to MovieBooking!',
    html: `<h2>Hi ${user.name},</h2><p>Thanks for registering with MovieBooking. Start exploring movies now!</p>`,
  });

  createSendToken(user, 201, res);
});

// @desc    Login
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('This account has been deactivated. Contact support.', 403));
  }

  createSendToken(user, 200, res);
});

// @desc    Logout (clears cookie)
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', { expires: new Date(Date.now() + 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// @desc    Get current logged-in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

// @desc    Update profile (name, phone, avatar handled separately)
// @route   PATCH /api/v1/auth/update-profile
// @access  Private
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, phone } },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: { user } });
});

// @desc    Update password
// @route   PATCH /api/v1/auth/update-password
// @access  Private
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  createSendToken(user, 200, res);
});

// @desc    Forgot password - sends reset token via email
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('No account found with that email.', 404));

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Your password reset link (valid for 10 min)',
      html: `<p>Forgot your password? Click below to reset it:</p><a href="${resetURL}">${resetURL}</a><p>If you didn't request this, ignore this email.</p>`,
    });
    res.status(200).json({ success: true, message: 'Reset link sent to email.' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Failed to send email. Please try again later.', 500));
  }
});

// @desc    Reset password using token from email
// @route   PATCH /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired.', 400));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  createSendToken(user, 200, res);
});