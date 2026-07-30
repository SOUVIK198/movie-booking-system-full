const mongoose = require('mongoose');

/**
 * Sub-document tracking the live state of a single physical seat for THIS show.
 * `version` is used for optimistic locking: every state transition (available ->
 * locked -> booked) must supply the version it read, and the update increments
 * it. A version mismatch means someone else changed the seat first, so the
 * request is rejected with a 409 and the client must refetch.
 */
const showSeatSchema = new mongoose.Schema(
  {
    seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
    status: {
      type: String,
      enum: ['available', 'locked', 'booked'],
      default: 'available',
    },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lockExpiresAt: { type: Date, default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    version: { type: Number, default: 0 },
  },
  { _id: false }
);

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
    screen: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    showDate: { type: Date, required: true, index: true }, // date only (midnight UTC of that day)
    startTime: { type: String, required: true }, // "18:30"
    endTime: { type: String },
    basePrice: { type: Number, required: true },
    format: { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
    language: { type: String, required: true },
    seats: [showSeatSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Enables Mongoose's document-level optimistic concurrency: every save()
    // issues an update conditioned on the __v it read. If another request
    // modified (and thus incremented) the document in between, Mongoose
    // throws a VersionError instead of silently overwriting — this is what
    // makes concurrent seat-lock requests safe (see showController.transitionSeats).
    optimisticConcurrency: true,
  }
);

showSchema.index({ movie: 1, theatre: 1, showDate: 1 });

/** Convenience virtuals for quick availability counts (not persisted). */
showSchema.methods.availableSeatCount = function () {
  return this.seats.filter((s) => s.status === 'available').length;
};

module.exports = mongoose.model('Show', showSchema);