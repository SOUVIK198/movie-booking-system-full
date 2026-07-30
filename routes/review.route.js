const express = require('express');
const reviewController = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.patch('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

module.exports = router;