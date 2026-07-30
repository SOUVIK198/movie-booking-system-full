const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/summary', dashboardController.getSummary);
router.get('/revenue', dashboardController.getRevenueTimeseries);
router.get('/top-movies', dashboardController.getTopMovies);
router.get('/revenue-by-theatre', dashboardController.getRevenueByTheatre);

module.exports = router;