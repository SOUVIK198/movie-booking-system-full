const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
    name: { type: String, required: true }, // e.g. "Screen 1", "Audi 3 - IMAX"
    screenType: { type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: '2D' },
    totalSeats: { type: Number, required: true },
    seatLayout: {
      rows: { type: Number, required: true },
      seatsPerRow: { type: Number, required: true },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

screenSchema.index({ theatre: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Screen', screenSchema);