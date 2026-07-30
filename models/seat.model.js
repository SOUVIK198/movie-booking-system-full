const mongoose = require('mongoose');

/**
 * Represents a physical seat belonging to a Screen (the "seat map template").
 * Per-show availability/locking is tracked separately on the Show document
 * (see Show.seats[]) so the same physical seat can have different
 * booking states across different shows.
 */
const seatSchema = new mongoose.Schema(
  {
    screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true, index: true },
    row: { type: String, required: true }, // 'A', 'B', ...
    seatNumber: { type: Number, required: true }, // 1, 2, 3...
    seatType: {
      type: String,
      enum: ['regular', 'premium', 'recliner'],
      default: 'regular',
    },
    priceMultiplier: { type: Number, default: 1 }, // applied on top of show base price
    isActive: { type: Boolean, default: true }, // e.g. broken seat, disabled
  },
  { timestamps: true }
);

seatSchema.index({ screen: 1, row: 1, seatNumber: 1 }, { unique: true });
seatSchema.virtual('label').get(function () {
  return `${this.row}${this.seatNumber}`;
});
seatSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Seat', seatSchema);