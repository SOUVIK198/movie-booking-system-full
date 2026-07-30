const express = require('express');
const movieController = require('../controllers/movieController');
const reviewController = require('../controllers/reviewController');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/meta/filters', movieController.getMovieFilters);

router.get('/', movieController.getMovies);
router.post('/', protect, restrictTo('admin'), movieController.createMovie);

router.get('/:id', movieController.getMovie);
router.patch('/:id', protect, restrictTo('admin'), movieController.updateMovie);
router.delete('/:id', protect, restrictTo('admin'), movieController.deleteMovie);

router.post(
  '/:id/poster',
  protect,
  restrictTo('admin'),
  upload.single('poster'),
  movieController.uploadPoster
);

router.get('/:id/shows', movieController.getMovieShows);

// Nested review routes for a movie
router.get('/:movieId/reviews', reviewController.getMovieReviews);
router.post('/:movieId/reviews', protect, reviewController.createReview);

module.exports = router;