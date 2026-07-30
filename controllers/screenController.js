const Screen = require('../models/Screen');
const Seat = require('../models/Seat');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Auto-generates the physical seat grid for a screen based on rows/seatsPerRow.
 * The last ~20% of rows are marked 'premium', middle few 'recliner' near the back,
 * just as a sensible default — admin can edit individual seat types afterward.
 */
const generateSeatsForScreen = async (screen) => {
  const { rows, seatsPerRow } = screen.seatLayout;
  const seatsToInsert = [];

  for (let r = 0; r < rows; r += 1) {
    const rowLabel = ROW_LETTERS[r] || `R${r}`;
    let seatType = 'regular';
    if (r >= rows - 2) seatType = 'recliner';
    else if (r >= Math.floor(rows * 0.6)) seatType = 'premium';

    for (let n = 1; n <= seatsPerRow; n += 1) {
      seatsToInsert.push({
        screen: screen._id,
        row: rowLabel,
        seatNumber: n,
        seatType,
        priceMultiplier: seatType === 'recliner' ? 1.5 : seatType === 'premium' ? 1.25 : 1,
      });
    }
  }

  await Seat.insertMany(seatsToInsert, { ordered: false });
};

// @desc    List screens for a theatre
// @route   GET /api/v1/theatres/:theatreId/screens
exports.getScreens = catchAsync(async (req, res) => {
  const screens = await Screen.find({ theatre: req.params.theatreId, isActive: true });
  res.status(200).json({ success: true, data: { screens } });
});

// @desc    Create a screen (and auto-generate its seat map)
// @route   POST /api/v1/theatres/:theatreId/screens
// @access  Private/Admin
exports.createScreen = catchAsync(async (req, res) => {
  const screen = await Screen.create({ ...req.body, theatre: req.params.theatreId });
  await generateSeatsForScreen(screen);
  res.status(201).json({ success: true, data: { screen } });
});

// @desc    Update screen metadata (NOTE: does not regenerate seats)
// @route   PATCH /api/v1/screens/:id
// @access  Private/Admin
exports.updateScreen = catchAsync(async (req, res, next) => {
  const screen = await Screen.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!screen) return next(new AppError('Screen not found', 404));
  res.status(200).json({ success: true, data: { screen } });
});

// @desc    Delete (soft) screen
// @route   DELETE /api/v1/screens/:id
// @access  Private/Admin
exports.deleteScreen = catchAsync(async (req, res, next) => {
  const screen = await Screen.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!screen) return next(new AppError('Screen not found', 404));
  res.status(204).json({ success: true, data: null });
});

// @desc    Get seat map (physical template) for a screen
// @route   GET /api/v1/screens/:id/seats
exports.getScreenSeats = catchAsync(async (req, res) => {
  const seats = await Seat.find({ screen: req.params.id, isActive: true }).sort('row seatNumber');
  res.status(200).json({ success: true, data: { seats } });
});

// @desc    Update a single seat (type/price/active) - fine-grained admin control
// @route   PATCH /api/v1/seats/:id
// @access  Private/Admin
exports.updateSeat = catchAsync(async (req, res, next) => {
  const seat = await Seat.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!seat) return next(new AppError('Seat not found', 404));
  res.status(200).json({ success: true, data: { seat } });
});

exports.generateSeatsForScreen = generateSeatsForScreen;