const Review = require('../models/Review');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');

// @desc    Get reviews for a movie
// @route   GET /api/v1/movies/:movieId/reviews
exports.getMovieReviews = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Review.find({ movie: req.params.movieId }), req.query)
    .sort()
    .paginate();
  const reviews = await features.query.populate('user', 'name avatar');
  res.status(200).json({ success: true, results: reviews.length, data: { reviews } });
});

// @desc    Create a review (one per user per movie)
// @route   POST /api/v1/movies/:movieId/reviews
// @access  Private
exports.createReview = catchAsync(async (req, res, next) => {
  const existing = await Review.findOne({ movie: req.params.movieId, user: req.user._id });
  if (existing) return next(new AppError('You have already reviewed this movie.', 400));

  const review = await Review.create({
    movie: req.params.movieId,
    user: req.user._id,
    rating: req.body.rating,
    comment: req.body.comment,
  });

  res.status(201).json({ success: true, data: { review } });
});

// @desc    Update own review
// @route   PATCH /api/v1/reviews/:id
// @access  Private
exports.updateReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));
  if (String(review.user) !== String(req.user._id)) {
    return next(new AppError('You can only edit your own review.', 403));
  }
  review.rating = req.body.rating ?? review.rating;
  review.comment = req.body.comment ?? review.comment;
  await review.save();
  res.status(200).json({ success: true, data: { review } });
});

// @desc    Delete own review (or admin)
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = catchAsync(async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (!review) return next(new AppError('Review not found', 404));
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to delete this review.', 403));
  }
  await review.deleteOne();
  await Review.recalculateMovieRating(review.movie);
  res.status(204).json({ success: true, data: null });
});