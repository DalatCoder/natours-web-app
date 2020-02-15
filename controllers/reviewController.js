const handleAsyncException = require('./../utils/asyncExceptionHandler');
const Review = require('./../models/reviewModel');
const factory = require('./../controllers/factoryHandler');

/*
 * factory.createOne accept tourId and userId in req.body
 * there are two types of route with review resources
 * POST: /api/v1/reviews to create new review with all information in req.body
 * POST: /api/v1/tours/:tourId/reviews to create new review with
 * tourId in req.params and userId req.user after user have login
 */
exports.setTourAndUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.GetAllReviewBelongToUser = handleAsyncException(async (req, res) => {
  const userId = req.user.id;

  const reviews = await Review.find({ user: userId });

  res.status(200).json({
    status: 'fail',
    results: reviews.length,
    data: {
      reviews
    }
  });
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review, { path: 'user' });
exports.createReview = factory.createOne(Review, [
  'rating',
  'review',
  'user',
  'tour'
]);
exports.updateReview = factory.updateOne(Review, ['rating', 'review']);
exports.deleteReview = factory.deleteOne(Review);
