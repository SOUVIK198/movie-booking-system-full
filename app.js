const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const AppError = require('./utils/AppError');
const globalErrorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./utils/logger');

const authRoutes = require('./routes/authRoutes');
const movieRoutes = require('./routes/movieRoutes');
const theatreRoutes = require('./routes/theatreRoutes');
const screenRoutes = require('./routes/screenRoutes');
const seatRoutes = require('./routes/seatRoutes');
const showRoutes = require('./routes/showRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentController = require('./controllers/paymentController');

const app = express();

app.set('trust proxy', 1); // needed behind a reverse proxy / load balancer (Heroku, Render, Nginx)

// --- Security & core middleware ---
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
}

// Stripe webhook needs the RAW body to verify signatures, so it must be
// mounted BEFORE express.json() and use its own raw parser.
app.post(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.stripeWebhook
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // strips $ and . from req.body/query/params (NoSQL injection)
app.use(xss()); // sanitizes user input from malicious HTML/JS

app.use('/api', apiLimiter);

// --- Health check ---
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Movie Booking API is healthy', time: new Date() });
});

// --- Routes ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/movies', movieRoutes);
app.use('/api/v1/theatres', theatreRoutes);
app.use('/api/v1/screens', screenRoutes);
app.use('/api/v1/seats', seatRoutes);
app.use('/api/v1/shows', showRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/users', userRoutes);

// --- 404 handler for unmatched routes ---
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

// --- Global error handler (must be last) ---
app.use(globalErrorHandler);

module.exports = app;