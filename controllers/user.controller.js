const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

// @desc    Admin: list all users (search/filter/paginate)
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getUsers = catchAsync(async (req, res) => {
  const features = new ApiFeatures(User.find(), req.query).filter().sort().limitFields().paginate();
  const users = await features.query;
  res.status(200).json({ success: true, results: users.length, data: { users } });
});

// @desc    Admin: get single user
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ success: true, data: { user } });
});

// @desc    Admin: activate/deactivate a user or change role
// @route   PATCH /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  const allowed = (({ isActive, role }) => ({ isActive, role }))(req.body);
  const user = await User.findByIdAndUpdate(req.params.id, allowed, {
    new: true,
    runValidators: true,
  });
  if (!user) return next(new AppError('User not found', 404));
  res.status(200).json({ success: true, data: { user } });
});

// @desc    Admin: delete a user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return next(new AppError('User not found', 404));
  res.status(204).json({ success: true, data: null });
});

// @desc    Upload/replace own avatar
// @route   POST /api/v1/users/me/avatar
// @access  Private
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload an image file.', 400));

  const user = await User.findById(req.user._id);
  if (user.avatar?.publicId) await deleteFromCloudinary(user.avatar.publicId);

  const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, 'movie-booking/avatars');
  user.avatar = { url, publicId };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, data: { user } });
});