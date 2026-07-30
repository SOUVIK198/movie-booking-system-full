const { body } = require('express-validator');

exports.registerValidator = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().withMessage('Provide a valid email').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('phone').optional().isMobilePhone().withMessage('Provide a valid phone number'),
];

exports.loginValidator = [
  body('email').isEmail().withMessage('Provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.updatePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

exports.forgotPasswordValidator = [body('email').isEmail().withMessage('Provide a valid email')];

exports.resetPasswordValidator = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];