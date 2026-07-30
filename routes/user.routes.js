const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/me/avatar', protect, upload.single('avatar'), userController.uploadAvatar);

router.use(protect, restrictTo('admin'));
router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;