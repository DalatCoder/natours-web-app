const express = require('express');
const userController = require('../controllers/userController');
const authenticaltionController = require('./../controllers/authenticationControllers');

const router = express.Router();

router.post('/signup', authenticaltionController.signup);
router.post('/login', authenticaltionController.login);
router.get('/logout', authenticaltionController.loggout);

router.post('/forgotPassword', authenticaltionController.forgotPassword);
router.patch(
  '/resetPassword/:resetPasswordToken',
  authenticaltionController.resetPassword
);

// Every single route after this middleware required to login
router.use(authenticaltionController.protect);

// NORMAL USER
router.patch('/updateMyPassword', authenticaltionController.updatePassword);
router.get('/getMe', userController.getMe, userController.getUserById);
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

// ADMIN ONLY!
router.use(authenticaltionController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createNewUser);
router
  .route('/:id')
  .get(userController.getUserById)
  .patch(userController.updateUserById)
  .delete(userController.deleteUserById);

module.exports = router;
