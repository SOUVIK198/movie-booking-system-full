const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  updatePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.patch('/reset-password/:token', resetPasswordValidator, validate, authController.resetPassword);

// Protected
router.get('/me', protect, authController.getMe);
router.patch('/update-profile', protect, authController.updateProfile);
router.patch(
  '/update-password',
  protect,
  updatePasswordValidator,
  validate,
  authController.updatePassword
);

module.exports = router;