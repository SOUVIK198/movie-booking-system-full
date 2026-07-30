const rateLimit = require('express-rate-limit');

/** General API limiter applied globally. */
const apiLimiter = rateLimit({
  windowMs: (Number(process.env.RATE_LIMIT_WINDOW_MIN) || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/** Stricter limiter for auth endpoints to slow down brute-force attempts. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again in 15 minutes.' },
});

/** Very strict limiter for seat-lock endpoints to prevent lock-spamming/DoS. */
const seatLockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many seat operations, slow down.' },
});

module.exports = { apiLimiter, authLimiter, seatLockLimiter };