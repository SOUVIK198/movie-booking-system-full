const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB using Mongoose.
 * Exits the process on failure so the container/orchestrator can restart it.
 */
const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose (6+/8+) no longer needs useNewUrlParser/useUnifiedTopology
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;