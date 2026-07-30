const mongoose = require('mongoose');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Screen = require('../models/Screen');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const LOCK_TTL_MS = (Number(process.env.SEAT_LOCK_TTL_SECONDS) || 300) * 1000;

// @desc    List shows (filter by movie, theatre, city, date)
// @route   GET /api/v1/shows
exports.getShows = catchAsync(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.movie) filter.movie = req.query.movie;
  if (req.query.theatre) filter.theatre = req.query.theatre;
  if (req.query.date) {
    const start = new Date(req.query.date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.showDate = { $gte: start, $lt: end };
  }

  const shows = await Show.find(filter)
    .select('-seats')
    .populate('movie', 'title poster duration')
    .populate('theatre', 'name address')
    .populate('screen', 'name screenType')
    .sort('showDate startTime');

  res.status(200).json({ success: true, results: shows.length, data: { shows } });
});

// @desc    Create a show. Snapshots the screen's current seat template into
//          show.seats[] so later edits to the screen's seat map don't retroactively
//          change already-scheduled/booked shows.
// @route   POST /api/v1/shows
// @access  Private/Admin
exports.createShow = catchAsync(async (req, res, next) => {
  const { movie, theatre, screen, showDate, startTime, endTime, basePrice, format, language } = req.body;

  const screenDoc = await Screen.findById(screen);
  if (!screenDoc) return next(new AppError('Screen not found', 404));

  const seats = await Seat.find({ screen, isActive: true });
  if (!seats.length) return next(new AppError('This screen has no seats configured.', 400));

  const show = await Show.create({
    movie,
    theatre,
    screen,
    showDate,
    startTime,
    endTime,
    basePrice,
    format,
    language,
    seats: seats.map((s) => ({ seat: s._id, status: 'available', version: 0 })),
  });

  res.status(201).json({ success: true, data: { show } });
});

// @desc    Update show metadata (time/price). Does not touch seat state.
// @route   PATCH /api/v1/shows/:id
// @access  Private/Admin
exports.updateShow = catchAsync(async (req, res, next) => {
  const allowed = (({ showDate, startTime, endTime, basePrice, isActive }) => ({
    showDate,
    startTime,
    endTime,
    basePrice,
    isActive,
  }))(req.body);

  const show = await Show.findByIdAndUpdate(req.params.id, allowed, {
    new: true,
    runValidators: true,
  }).select('-seats');
  if (!show) return next(new AppError('Show not found', 404));
  res.status(200).json({ success: true, data: { show } });
});

// @desc    Delete (soft) show
// @route   DELETE /api/v1/shows/:id
// @access  Private/Admin
exports.deleteShow = catchAsync(async (req, res, next) => {
  const show = await Show.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!show) return next(new AppError('Show not found', 404));
  res.status(204).json({ success: true, data: null });
});

// @desc    Get full seat map + live status for a show (used on Seat Selection page)
// @route   GET /api/v1/shows/:id/seats
exports.getShowSeatMap = catchAsync(async (req, res, next) => {
  const show = await Show.findById(req.params.id)
    .populate({ path: 'seats.seat', select: 'row seatNumber seatType priceMultiplier' })
    .populate('movie', 'title')
    .populate('theatre', 'name')
    .populate('screen', 'name seatLayout');

  if (!show) return next(new AppError('Show not found', 404));

  // Auto-expire stale locks on read so the UI never shows a phantom "locked" seat.
  const now = new Date();
  let changed = false;
  show.seats.forEach((s) => {
    if (s.status === 'locked' && s.lockExpiresAt && s.lockExpiresAt < now) {
      s.status = 'available';
      s.lockedBy = null;
      s.lockExpiresAt = null;
      s.version += 1;
      changed = true;
    }
  });
  if (changed) await show.save();

  const seatMap = show.seats.map((s) => ({
    seatId: s.seat._id,
    label: `${s.seat.row}${s.seat.seatNumber}`,
    row: s.seat.row,
    seatNumber: s.seat.seatNumber,
    seatType: s.seat.seatType,
    price: Math.round(show.basePrice * s.seat.priceMultiplier * 100) / 100,
    status: s.status,
    version: s.version,
    lockedByMe: req.user ? String(s.lockedBy) === String(req.user._id) : false,
  }));

  res.status(200).json({
    success: true,
    data: {
      show: {
        _id: show._id,
        movie: show.movie,
        theatre: show.theatre,
        screen: show.screen,
        showDate: show.showDate,
        startTime: show.startTime,
        basePrice: show.basePrice,
        format: show.format,
        language: show.language,
      },
      seats: seatMap,
    },
  });
});

/**
 * Core optimistic-locking primitive shared by lockSeats/unlockSeats/bookingController.
 * Atomically flips seats from `fromStatus` -> `toStatus` ONLY if their current
 * status/version still matches what the caller expects. Mongo's atomic
 * `findOneAndUpdate` with a positional array filter + version check in the
 * query guarantees no two concurrent requests can both "win" the same seat.
 *
 * Returns { success, show, conflictSeats } — conflictSeats lists seatIds that
 * could not be transitioned (already taken by someone else).
 */
exports.transitionSeats = async ({
  showId,
  seatIds,
  fromStatuses,
  toStatus,
  userId,
  lockExpiresAt,
  bookingId,
  session,
  _retriesLeft = 5,
}) => {
  const show = await Show.findById(showId).session(session || null);
  if (!show) throw new AppError('Show not found', 404);

  const conflictSeats = [];
  const now = new Date();

  for (const seatId of seatIds) {
    const seatEntry = show.seats.find((s) => String(s.seat) === String(seatId));
    if (!seatEntry) {
      conflictSeats.push(seatId);
      continue;
    }

    const isExpiredLock =
      seatEntry.status === 'locked' && seatEntry.lockExpiresAt && seatEntry.lockExpiresAt < now;
    const effectiveStatus = isExpiredLock ? 'available' : seatEntry.status;

    const ownedByCaller = String(seatEntry.lockedBy) === String(userId);
    const allowedFrom =
      fromStatuses.includes(effectiveStatus) ||
      (effectiveStatus === 'locked' && ownedByCaller && fromStatuses.includes('locked'));

    if (!allowedFrom) {
      conflictSeats.push(seatId);
      continue;
    }

    seatEntry.status = toStatus;
    seatEntry.version += 1;
    if (toStatus === 'locked') {
      seatEntry.lockedBy = userId;
      seatEntry.lockExpiresAt = lockExpiresAt;
    } else if (toStatus === 'available') {
      seatEntry.lockedBy = null;
      seatEntry.lockExpiresAt = null;
    } else if (toStatus === 'booked') {
      seatEntry.lockedBy = null;
      seatEntry.lockExpiresAt = null;
      seatEntry.booking = bookingId;
    }
  }

  if (conflictSeats.length) {
    return { success: false, show, conflictSeats };
  }

  try {
    await show.save({ session });
  } catch (err) {
    // VersionError means another request saved this Show document between our
    // read and write (e.g. two users locking DIFFERENT seats on the same show
    // at the same instant). Re-read the fresh document and retry the whole
    // decision — this is standard optimistic-locking retry-on-conflict.
    if (err.name === 'VersionError' && _retriesLeft > 0) {
      return exports.transitionSeats({
        showId,
        seatIds,
        fromStatuses,
        toStatus,
        userId,
        lockExpiresAt,
        bookingId,
        session,
        _retriesLeft: _retriesLeft - 1,
      });
    }
    throw err;
  }

  return { success: true, show, conflictSeats: [] };
};

// @desc    Lock seats temporarily while user proceeds to checkout (real-time via socket)
// @route   POST /api/v1/shows/:id/lock-seats
// @access  Private
exports.lockSeats = catchAsync(async (req, res, next) => {
  const { seatIds } = req.body;
  if (!Array.isArray(seatIds) || !seatIds.length) {
    return next(new AppError('seatIds must be a non-empty array.', 400));
  }

  const lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS);

  const result = await exports.transitionSeats({
    showId: req.params.id,
    seatIds,
    fromStatuses: ['available'],
    toStatus: 'locked',
    userId: req.user._id,
    lockExpiresAt,
  });

  if (!result.success) {
    return res.status(409).json({
      success: false,
      message: 'Some seats are no longer available.',
      conflictSeats: result.conflictSeats,
    });
  }

  // Broadcast to everyone viewing this show's seat map in real time.
  const io = req.app.get('io');
  if (io) {
    io.to(`show:${req.params.id}`).emit('seats:locked', {
      seatIds,
      lockedBy: req.user._id,
      expiresAt: lockExpiresAt,
    });
  }

  res.status(200).json({ success: true, data: { lockExpiresAt, seatIds } });
});

// @desc    Release a lock (user navigates away / cancels before payment)
// @route   POST /api/v1/shows/:id/unlock-seats
// @access  Private
exports.unlockSeats = catchAsync(async (req, res, next) => {
  const { seatIds } = req.body;
  if (!Array.isArray(seatIds) || !seatIds.length) {
    return next(new AppError('seatIds must be a non-empty array.', 400));
  }

  const result = await exports.transitionSeats({
    showId: req.params.id,
    seatIds,
    fromStatuses: ['locked'],
    toStatus: 'available',
    userId: req.user._id,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`show:${req.params.id}`).emit('seats:unlocked', { seatIds });
  }

  res.status(200).json({ success: true, data: { released: result.success, conflictSeats: result.conflictSeats } });
});