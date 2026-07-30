const Booking = require('../models/Booking');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');

// @desc    High-level dashboard summary cards
// @route   GET /api/v1/dashboard/summary
// @access  Private/Admin
exports.getSummary = catchAsync(async (req, res) => {
  const [totalRevenueAgg, totalBookings, totalUsers, totalMovies, totalTheatres] = await Promise.all([
    Booking.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Booking.countDocuments({ status: 'confirmed' }),
    User.countDocuments({ role: 'user' }),
    Movie.countDocuments({ isActive: true }),
    Theatre.countDocuments({ isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      totalBookings,
      totalUsers,
      totalMovies,
      totalTheatres,
    },
  });
});

// @desc    Revenue over time (daily, last N days) for a chart
// @route   GET /api/v1/dashboard/revenue?days=30
// @access  Private/Admin
exports.getRevenueTimeseries = catchAsync(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const data = await Booking.aggregate([
    { $match: { status: 'confirmed', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({ success: true, data: { timeseries: data } });
});

// @desc    Top performing movies by revenue
// @route   GET /api/v1/dashboard/top-movies
// @access  Private/Admin
exports.getTopMovies = catchAsync(async (req, res) => {
  const data = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: '$movie', revenue: { $sum: '$totalAmount' }, bookings: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
    { $unwind: '$movie' },
    { $project: { revenue: 1, bookings: 1, 'movie.title': 1, 'movie.poster': 1 } },
  ]);

  res.status(200).json({ success: true, data: { topMovies: data } });
});

// @desc    Revenue broken down by theatre
// @route   GET /api/v1/dashboard/revenue-by-theatre
// @access  Private/Admin
exports.getRevenueByTheatre = catchAsync(async (req, res) => {
  const data = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: '$theatre', revenue: { $sum: '$totalAmount' }, bookings: { $sum: 1 } } },
    { $sort: { revenue: -1 } },
    { $lookup: { from: 'theatres', localField: '_id', foreignField: '_id', as: 'theatre' } },
    { $unwind: '$theatre' },
    { $project: { revenue: 1, bookings: 1, 'theatre.name': 1 } },
  ]);

  res.status(200).json({ success: true, data: { revenueByTheatre: data } });
});