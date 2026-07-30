process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('UNCAUGHT EXCEPTION 💥 Shutting down...', err.name, err.message);
  process.exit(1);
});

const dotenv = require('dotenv');
dotenv.config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const registerSeatSocket = require('./sockets/seatSocket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// Make io available inside Express controllers via req.app.get('io')
app.set('io', io);

registerSeatSocket(io);

const start = async () => {
  await connectDB();

  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION 💥 ${err.name}: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => logger.info('Process terminated.'));
});

module.exports = server;