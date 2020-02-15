const express = require('express');

const viewController = require('./../controllers/viewController');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authenticationControllers');

const router = express.Router();

router.get('/me', authController.protect, viewController.getMe);
router.post(
  '/submit-user-data',
  authController.protect,
  viewController.submitUserData
);

// Check if user is login to render website header properly
router.use(authController.isUserLoggedIn);

router.get(
  '/',
  bookingController.createBookingCheckout,
  viewController.getOverview
);
router.get('/tour/:slug', viewController.getTour);
router.get('/login', viewController.getLoginForm);
router.get('/signup', viewController.getSignUpForm);
router.get('/forgotPassword', viewController.getForgotPasswordForm);
router.get('/resetPassword/:resetToken', viewController.getResetPasswordForm);
router.get('/my-tours', authController.protect, viewController.getMyTours);

module.exports = router;
