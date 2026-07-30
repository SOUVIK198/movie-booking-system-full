const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    seats: [
      {
        seat: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true },
        label: String, // denormalized e.g. "F12" for fast ticket rendering
        price: Number,
      },
    ],
    totalAmount: { type: Number, required: true },
    convenienceFee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'expired', 'failed'],
      default: 'pending',
      index: true,
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    ticketCode: { type: String, unique: true, sparse: true }, // used for QR / PDF ticket
    cancelledAt: Date,
    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);