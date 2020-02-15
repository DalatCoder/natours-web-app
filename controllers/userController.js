const multer = require('multer');
const sharp = require('sharp');

const User = require('./../models/userModel');
const asyncMiddlewareExceptionHandler = require('./../utils/asyncExceptionHandler');
const AppError = require('./../utils/appError');
const factory = require('./../controllers/factoryHandler');
const filterObject = require('./../utils/filterObject');

// var storage = multer.diskStorage({
//   destination: function(req, file, cb) {
//     cb(null, 'public/img/users/');
//   },
//   filename: function(req, file, cb) {
//     // user-id-currentTimestamp.jpeg
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

// Save image as buffer in memory to later proceessing using sharp
const storage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please upload only image!', 400), false);
  }
};

const upload = multer({ storage: storage, fileFilter: multerFilter });

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = asyncMiddlewareExceptionHandler(
  async (req, res, next) => {
    if (!req.file) return next();

    // Because the image is saved as buffer so there is no req.file.filename property
    // So we have to manualy set that field to later middleware to handle (/updateMe)
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.file.filename}`);

    next();
  }
);

// Middleware to add extra information to factory.getOne
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = asyncMiddlewareExceptionHandler(async (req, res) => {
  if (req.body.password || req.body.passwordConfirm)
    throw new AppError(
      'You cannot update your password here! Please use update password feature instead',
      400
    );

  // Only allow user to update name and email
  const filterdBody = filterObject(req.body, ['name', 'email']);
  if (req.file) filterdBody.photo = req.file.filename;

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterdBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = asyncMiddlewareExceptionHandler(async (req, res) => {
  // Active user ==> Inactive user
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ADMIN ONLY!
exports.getAllUsers = factory.getAll(User);
exports.getUserById = factory.getOne(User);
exports.createNewUser = factory.createOne(User);
exports.updateUserById = factory.updateOne(User, [
  'name',
  'email',
  'role',
  'active'
]);
exports.deleteUserById = factory.deleteOne(User);
