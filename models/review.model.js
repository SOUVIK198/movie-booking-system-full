const mongoose = require('mongoose');
const Movie = require('./Movie');

const reviewSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

// One review per user per movie
reviewSchema.index({ movie: 1, user: 1 }, { unique: true });

/** Recalculate movie's avgRating / numReviews whenever reviews change. */
reviewSchema.statics.recalculateMovieRating = async function (movieId) {
  const stats = await this.aggregate([
    { $match: { movie: movieId } },
    { $group: { _id: '$movie', avgRating: { $avg: '$rating' }, numReviews: { $sum: 1 } } },
  ]);

  await Movie.findByIdAndUpdate(movieId, {
    avgRating: stats.length ? Math.round(stats[0].avgRating * 10) / 10 : 0,
    numReviews: stats.length ? stats[0].numReviews : 0,
  });
};

reviewSchema.post('save', function () {
  this.constructor.recalculateMovieRating(this.movie);
});

// findOneAndDelete / findOneAndUpdate hooks (for update/delete of reviews)
reviewSchema.post(/findOneAnd/, async function (doc) {
  if (doc) await doc.constructor.recalculateMovieRating(doc.movie);
});

module.exports = mongoose.model('Review', reviewSchema);