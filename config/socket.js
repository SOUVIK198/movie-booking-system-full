const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Registers Socket.io event handlers for real-time seat map updates.
 *
 * Room convention: `show:<showId>` — every client viewing a given show's seat
 * selection page joins this room and receives 'seats:locked' / 'seats:unlocked'
 * / 'seats:released' / 'seats:booked' broadcasts emitted by the REST controllers
 * (see showController.lockSeats/unlockSeats and bookingController.cancelBooking).
 */
module.exports = function registerSeatSocket(io) {
  io.use((socket, next) => {
    // Optional auth: attach userId if a token is provided, but don't require it
    // (guests can still watch a seat map update live, just can't lock seats).
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
      } catch (err) {
        // invalid token: proceed as anonymous viewer
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    socket.on('show:join', (showId) => {
      socket.join(`show:${showId}`);
    });

    socket.on('show:leave', (showId) => {
      socket.leave(`show:${showId}`);
    });

    // Lightweight heartbeat used by the client to extend a lock's perceived
    // countdown UI (actual TTL enforcement always happens server-side).
    socket.on('seats:heartbeat', ({ showId, seatIds }) => {
      socket.to(`show:${showId}`).emit('seats:still-locked', { seatIds });
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });
};