const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authenticationControllers');
const reviewRoute = require('./../routes/reviewRoutes');

const router = express.Router();

router.param('id', tourController.checkExistedTourID);

router.use('/:tourId/reviews', reviewRoute);

router
  .route('/top-5-best-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router.route('/tours-statistics').get(tourController.getTourStatistics);

router
  .route('/tours-within-radius/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);
// /tours-within?distance=233&center=-40,45&unit=mi
// /tours-within/233/center/-40,45/unit/mi

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createNewTour
  );

router
  .route('/:id')
  .get(tourController.getTourById)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTourById
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTourById
  );

module.exports = router;
