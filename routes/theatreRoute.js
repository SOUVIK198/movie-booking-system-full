const express = require('express');
const theatreController = require('../controllers/theatreController');
const screenController = require('../controllers/screenController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.get('/meta/cities', theatreController.getCities);

router.get('/', theatreController.getTheatres);
router.post('/', protect, restrictTo('admin'), theatreController.createTheatre);

router.get('/:id', theatreController.getTheatre);
router.patch('/:id', protect, restrictTo('admin'), theatreController.updateTheatre);
router.delete('/:id', protect, restrictTo('admin'), theatreController.deleteTheatre);

// Nested screens
router.get('/:theatreId/screens', screenController.getScreens);
router.post('/:theatreId/screens', protect, restrictTo('admin'), screenController.createScreen);

module.exports = router;