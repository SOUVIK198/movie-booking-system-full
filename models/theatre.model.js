const mongoose = require('mongoose');

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: {
      street: String,
      city: { type: String, required: true, index: true },
      state: String,
      pincode: String,
    },
    location: {
      // GeoJSON for potential "theatres near me" queries
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },
    amenities: [{ type: String }], // parking, food-court, wheelchair-access...
    contactNumber: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

theatreSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Theatre', theatreSchema);