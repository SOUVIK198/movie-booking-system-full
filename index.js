const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Load environment variables
dotenv.config();

// Database
const connectDB = require("./config/db");

// Utils & Middleware
const logger = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

// Routes
const authRoutes = require("./routes/authRoutes");
const movieRoutes = require("./routes/movieRoutes");

const app = express();

// ======================
// Connect Database
// ======================
connectDB();

// ======================
// Middlewares
// ======================
app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Rate Limiter
app.use(apiLimiter);

// ======================
// Home Route
// ======================
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Movie Booking API Running Successfully 🚀",
  });
});

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

// ======================
// API Routes
// ======================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/movies", movieRoutes);

// ======================
// 404 Route
// ======================
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl}`,
  });
});

// ======================
// Global Error Handler
// ======================
app.use(errorHandler);

// ======================
// Start Server
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server connected to port ${PORT}`);
  logger.info(`Server connected to port ${PORT}`);
});