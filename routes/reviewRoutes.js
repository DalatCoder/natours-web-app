const express = require('express');

const authController = require('./../controllers/authenticationControllers');
const reviewController = require('./../controllers/reviewController');

const router = express.Router({ mergeParams: true });

// Every action with review resource required user to login
router.use(authController.protect);

// Only user is allowed to write new review
router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourAndUserIds,
    reviewController.createReview
  );

// Only user and admin have permission to modify current review
router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
