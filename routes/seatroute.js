const express = require('express');
const screenController = require('../controllers/screenController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.patch('/:id', protect, restrictTo('admin'), screenController.updateSeat);

module.exports = router;