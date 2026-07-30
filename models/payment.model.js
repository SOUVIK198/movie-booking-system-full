const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stripePaymentIntentId: { type: String, index: true },
    stripeCheckoutSessionId: { type: String, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    status: {
      type: String,
      enum: ['created', 'processing', 'succeeded', 'failed', 'refunded'],
      default: 'created',
    },
    method: { type: String, default: 'card' },
    receiptUrl: String,
    failureReason: String,
    refundedAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);