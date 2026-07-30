const mongoose = require('mongoose');
const crypto = require('crypto');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const ApiFeatures = require('../utils/apiFeatures');
const { transitionSeats } = require('./showController');

const generateTicketCode = () => `MB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// @desc    Create a pending booking from seats the user has already locked.
//          Uses a Mongo session/transaction so the Booking doc and the Show's
//          seat-state flip (locked -> booked-pending... actually kept 'locked'
//          until payment) are written atomically.
// @route   POST /api/v1/bookings
// @access  Private
exports.createBooking = catchAsync(async (req, res, next) => {
  const { showId, seatIds } = req.body;
  if (!showId || !Array.isArray(seatIds) || !seatIds.length) {
    return next(new AppError('showId and a non-empty seatIds array are required.', 400));
  }

  const show = await Show.findById(showId).populate('movie theatre');
  if (!show) return next(new AppError('Show not found', 404));

  // Verify the requesting user actually holds the lock on every requested seat.
  const seatEntries = show.seats.filter((s) => seatIds.includes(String(s.seat)));
  if (seatEntries.length !== seatIds.length) {
    return next(new AppError('One or more seats do not belong to this show.', 400));
  }

  const now = new Date();
  const notOwned = seatEntries.filter(
    (s) => !(s.status === 'locked' && String(s.lockedBy) === String(req.user._id) && s.lockExpiresAt > now)
  );
  if (notOwned.length) {
    return next(
      new AppError('Your seat lock has expired or seats are held by someone else. Please reselect.', 409)
    );
  }

  const seatDocs = await Seat.find({ _id: { $in: seatIds } });
  const seatPriceMap = new Map(seatDocs.map((s) => [String(s._id), s]));

  const seatsForBooking = seatIds.map((id) => {
    const seatDoc = seatPriceMap.get(String(id));
    const price = Math.round(show.basePrice * seatDoc.priceMultiplier * 100) / 100;
    return { seat: id, label: `${seatDoc.row}${seatDoc.seatNumber}`, price };
  });

  const totalSeatsPrice = seatsForBooking.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = Math.round(totalSeatsPrice * 0.05 * 100) / 100; // 5% convenience fee
  const totalAmount = Math.round((totalSeatsPrice + convenienceFee) * 100) / 100;

  const session = await mongoose.startSession();
  let booking;

  try {
    await session.withTransaction(async () => {
      const [createdBooking] = await Booking.create(
        [
          {
            user: req.user._id,
            show: show._id,
            movie: show.movie._id,
            theatre: show.theatre._id,
            seats: seatsForBooking,
            totalAmount,
            convenienceFee,
            status: 'pending',
            ticketCode: generateTicketCode(),
          },
        ],
        { session }
      );
      booking = createdBooking;
      // Seats remain 'locked' (now conceptually "reserved for this booking")
      // until payment succeeds, at which point paymentController flips them to 'booked'.
    });
  } finally {
    session.endSession();
  }

  res.status(201).json({ success: true, data: { booking } });
});

// @desc    Get logged-in user's booking history
// @route   GET /api/v1/bookings/my
// @access  Private
exports.getMyBookings = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Booking.find({ user: req.user._id }), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const bookings = await features.query
    .populate('movie', 'title poster')
    .populate('theatre', 'name address')
    .populate('show', 'showDate startTime format language');

  res.status(200).json({ success: true, results: bookings.length, data: { bookings } });
});

// @desc    Get single booking (owner or admin only)
// @route   GET /api/v1/bookings/:id
// @access  Private
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('movie')
    .populate('theatre')
    .populate('show')
    .populate('user', 'name email');

  if (!booking) return next(new AppError('Booking not found', 404));

  if (String(booking.user._id) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to view this booking.', 403));
  }

  res.status(200).json({ success: true, data: { booking } });
});

// @desc    Cancel a booking (releases seats back to available)
// @route   PATCH /api/v1/bookings/:id/cancel
// @access  Private
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError('Booking not found', 404));

  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    return next(new AppError('You are not authorized to cancel this booking.', 403));
  }

  if (booking.status === 'cancelled') {
    return next(new AppError('Booking is already cancelled.', 400));
  }

  const seatIds = booking.seats.map((s) => s.seat);

  await transitionSeats({
    showId: booking.show,
    seatIds,
    fromStatuses: ['locked', 'booked'],
    toStatus: 'available',
    userId: booking.user,
  });

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();

  const io = req.app.get('io');
  if (io) io.to(`show:${booking.show}`).emit('seats:released', { seatIds });

  res.status(200).json({ success: true, data: { booking } });
});

// @desc    Admin: view all bookings (filter by status/date/theatre)
// @route   GET /api/v1/bookings
// @access  Private/Admin
exports.getAllBookings = catchAsync(async (req, res) => {
  const features = new ApiFeatures(Booking.find(), req.query).filter().sort().limitFields().paginate();
  const bookings = await features.query
    .populate('user', 'name email')
    .populate('movie', 'title')
    .populate('theatre', 'name');

  res.status(200).json({ success: true, results: bookings.length, data: { bookings } });
});