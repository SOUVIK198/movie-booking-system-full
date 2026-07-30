const express = require('express');
const showController = require('../controllers/showController');
const { protect, restrictTo, optionalAuth } = require('../middleware/auth');
const { seatLockLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/', showController.getShows);
router.post('/', protect, restrictTo('admin'), showController.createShow);

router.patch('/:id', protect, restrictTo('admin'), showController.updateShow);
router.delete('/:id', protect, restrictTo('admin'), showController.deleteShow);

router.get('/:id/seats', optionalAuth, showController.getShowSeatMap);
router.post('/:id/lock-seats', protect, seatLockLimiter, showController.lockSeats);
router.post('/:id/unlock-seats', protect, seatLockLimiter, showController.unlockSeats);

module.exports = router;