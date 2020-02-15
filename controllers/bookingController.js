const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const catchAsyncException = require('../utils/asyncExceptionHandler');
const AppError = require('../utils/appError');
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const factory = require('./factoryHandler');

exports.getCheckoutSession = catchAsyncException(async (req, res) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  if (!tour) throw new AppError('Cannot find the tour with that ID', 404);

  // 2) Create check out session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}?tour=${tour.id}&user=${
      req.user.id
    }&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    line_items: [
      {
        name: `${tour.name} tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1
      }
    ]
  });

  // 3) Send the session to client
  res.status(200).json({
    status: 'success',
    session
  });
});

exports.createBookingCheckout = catchAsyncException(async (req, res, next) => {
  const { tour, user, price } = req.query;

  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(`${req.protocol}://${req.get('host')}`);
});

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.createBooking = factory.createOne(Booking, ['user', 'tour', 'price']);
exports.updateBooking = factory.updateOne(Booking, ['price', 'tour', 'user']);
exports.deleteBooking = factory.deleteOne(Booking);
