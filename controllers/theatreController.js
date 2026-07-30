const Theatre = require('../models/Theatre');
const Screen = require('../models/Screen');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');

// @desc    List theatres (filter by city, search by name)
// @route   GET /api/v1/theatres
exports.getTheatres = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Theatre.find({ isActive: true }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const theatres = await features.query;
  res.status(200).json({ success: true, results: theatres.length, data: { theatres } });
});

// @desc    Get single theatre with its screens
// @route   GET /api/v1/theatres/:id
exports.getTheatre = catchAsync(async (req, res, next) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) return next(new AppError('Theatre not found', 404));

  const screens = await Screen.find({ theatre: theatre._id, isActive: true });
  res.status(200).json({ success: true, data: { theatre, screens } });
});

// @desc    Create theatre
// @route   POST /api/v1/theatres
// @access  Private/Admin
exports.createTheatre = catchAsync(async (req, res) => {
  const theatre = await Theatre.create(req.body);
  res.status(201).json({ success: true, data: { theatre } });
});

// @desc    Update theatre
// @route   PATCH /api/v1/theatres/:id
// @access  Private/Admin
exports.updateTheatre = catchAsync(async (req, res, next) => {
  const theatre = await Theatre.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!theatre) return next(new AppError('Theatre not found', 404));
  res.status(200).json({ success: true, data: { theatre } });
});

// @desc    Delete (soft) theatre
// @route   DELETE /api/v1/theatres/:id
// @access  Private/Admin
exports.deleteTheatre = catchAsync(async (req, res, next) => {
  const theatre = await Theatre.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!theatre) return next(new AppError('Theatre not found', 404));
  res.status(204).json({ success: true, data: null });
});

// @desc    Distinct cities (for city-picker dropdown on homepage)
// @route   GET /api/v1/theatres/meta/cities
exports.getCities = catchAsync(async (req, res) => {
  const cities = await Theatre.distinct('address.city', { isActive: true });
  res.status(200).json({ success: true, data: { cities } });
});