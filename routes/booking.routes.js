const express = require('express');
const bookingController = require('../controllers/bookingController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/my', bookingController.getMyBookings);
router.post('/', bookingController.createBooking);
router.get('/:id', bookingController.getBooking);
router.patch('/:id/cancel', bookingController.cancelBooking);

router.get('/', restrictTo('admin'), bookingController.getAllBookings);

module.exports = router;