const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    language: [{ type: String, required: true }],
    genre: [{ type: String, required: true, index: true }],
    duration: { type: Number, required: true, comment: 'Duration in minutes' },
    releaseDate: { type: Date, required: true },
    endDate: { type: Date }, // when it stops showing
    cast: [
      {
        name: String,
        role: String,
        photo: String,
      },
    ],
    director: { type: String },
    censorRating: {
      type: String,
      enum: ['U', 'UA', 'A', 'S'],
      default: 'UA',
    },
    poster: {
      url: String,
      publicId: String,
    },
    banner: {
      url: String,
      publicId: String,
    },
    trailerUrl: String,
    format: [{ type: String, enum: ['2D', '3D', 'IMAX', '4DX'], default: ['2D'] }],
    status: {
      type: String,
      enum: ['upcoming', 'now_showing', 'archived'],
      default: 'upcoming',
      index: true,
    },
    avgRating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

movieSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Movie', movieSchema);