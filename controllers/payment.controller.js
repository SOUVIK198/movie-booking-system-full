const Stripe = require('stripe');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Show = require('../models/Show');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/sendEmail');
const generateTicketPDF = require('../utils/generateTicketPDF');
const { transitionSeats } = require('./showController');
const logger = require('../utils/logger');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create a Stripe Checkout Session for a pending booking
// @route   POST /api/v1/payments/checkout-session
// @access  Private
exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const { bookingId } = req.body;

  const booking = await Booking.findById(bookingId).populate('movie theatre');
  if (!booking) return next(new AppError('Booking not found', 404));
  if (String(booking.user) !== String(req.user._id)) {
    return next(new AppError('Not authorized for this booking.', 403));
  }
  if (booking.status !== 'pending') {
    return next(new AppError('This booking is not awaiting payment.', 400));
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: req.user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${booking.movie.title} - ${booking.theatre.name}`,
            description: `Seats: ${booking.seats.map((s) => s.label).join(', ')}`,
          },
          unit_amount: Math.round(booking.totalAmount * 100), // cents
        },
        quantity: 1,
      },
    ],
    metadata: { bookingId: String(booking._id), userId: String(req.user._id) },
    success_url: `${process.env.CLIENT_URL}/booking-success?bookingId=${booking._id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/checkout/${booking._id}?cancelled=true`,
  });

  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    stripeCheckoutSessionId: session.id,
    amount: booking.totalAmount,
    status: 'created',
  });

  booking.payment = payment._id;
  await booking.save();

  res.status(200).json({ success: true, data: { url: session.url, sessionId: session.id } });
});

/**
 * Shared logic to finalize a booking once payment is confirmed:
 * flips seats locked -> booked, marks booking confirmed, emails ticket PDF.
 * Called from the Stripe webhook (source of truth).
 */
const finalizeBookingPayment = async ({ bookingId, stripePaymentIntentId }) => {
  const booking = await Booking.findById(bookingId).populate('movie theatre show user');
  if (!booking) throw new AppError('Booking not found during payment finalization', 404);
  if (booking.status === 'confirmed') return booking; // idempotent

  const seatIds = booking.seats.map((s) => s.seat);

  const result = await transitionSeats({
    showId: booking.show._id,
    seatIds,
    fromStatuses: ['locked'],
    toStatus: 'booked',
    userId: booking.user._id,
    bookingId: booking._id,
  });

  if (!result.success) {
    // Extremely rare race: payment succeeded but a lock expired mid-flow.
    booking.status = 'failed';
    await booking.save();
    logger.error(`Seat conflict finalizing booking ${booking._id}: ${JSON.stringify(result.conflictSeats)}`);
    throw new AppError('Seat conflict while finalizing payment. Please contact support for a refund.', 409);
  }

  booking.status = 'confirmed';
  await booking.save();

  await Payment.findOneAndUpdate(
    { booking: booking._id },
    { status: 'succeeded', stripePaymentIntentId }
  );

  const pdfBuffer = await generateTicketPDF(booking);
  await sendEmail({
    to: booking.user.email,
    subject: `Your ticket for ${booking.movie.title} is confirmed!`,
    html: `<h2>Booking Confirmed 🎬</h2><p>Hi ${booking.user.name}, your seats (${booking.seats
      .map((s) => s.label)
      .join(', ')}) for <b>${booking.movie.title}</b> are confirmed.</p><p>Ticket code: <b>${booking.ticketCode}</b></p>`,
    attachments: [{ filename: `ticket-${booking.ticketCode}.pdf`, content: pdfBuffer }],
  });

  return booking;
};

// @desc    Stripe webhook endpoint - the authoritative source for payment confirmation
// @route   POST /api/v1/payments/webhook
// @access  Public (verified via Stripe signature)
exports.stripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { bookingId } = session.metadata;
    try {
      await finalizeBookingPayment({ bookingId, stripePaymentIntentId: session.payment_intent });
    } catch (err) {
      logger.error(`Failed to finalize booking ${bookingId}: ${err.message}`);
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const { bookingId } = session.metadata;
    const booking = await Booking.findById(bookingId);
    if (booking && booking.status === 'pending') {
      booking.status = 'expired';
      await booking.save();
      await transitionSeats({
        showId: booking.show,
        seatIds: booking.seats.map((s) => s.seat),
        fromStatuses: ['locked'],
        toStatus: 'available',
        userId: booking.user,
      });
    }
  }

  res.status(200).json({ received: true });
});

// @desc    Poll payment/booking status from the client on the success page
//          (in case webhook hasn't landed yet — client can show a spinner and retry).
// @route   GET /api/v1/payments/status/:bookingId
// @access  Private
exports.getPaymentStatus = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId).select('status ticketCode');
  if (!booking) return next(new AppError('Booking not found', 404));
  res.status(200).json({ success: true, data: { status: booking.status, ticketCode: booking.ticketCode } });
});

exports.finalizeBookingPayment = finalizeBookingPayment;