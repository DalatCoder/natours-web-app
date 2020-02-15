const util = require('util');
const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const asyncMiddlewareFunctionExceptionHandler = require('./../utils/asyncExceptionHandler');
const Email = require('./../utils/emailService');
const filterObject = require('./../utils/filterObject');

const signJWT = async userID => {
  return await util.promisify(jwt.sign)(
    { id: userID },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_EXPIRES_TIME
    }
  );
};

const createAndSendToken = async (user, statusCode, res) => {
  const token = await signJWT(user.id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // Send cookie along with token
  res.cookie('jwt', token, cookieOptions);

  // Hide password field
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.signup = asyncMiddlewareFunctionExceptionHandler(async (req, res) => {
  // Only create new user base on some necessary informatioin
  // Case User.create(req.body): if user pass path role = admin, then they will become administrator
  const filteredBody = filterObject(req.body, [
    'name',
    'email',
    'password',
    'passwordConfirm'
  ]);
  const newUser = await User.create(filteredBody);

  await createAndSendToken(newUser, 201, res);

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
});

exports.login = asyncMiddlewareFunctionExceptionHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new AppError('Please provide email and password', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError(`Incorrect email or password`, 401);

  const isCorrect = await user.isCorrectPassword(password, user.password);
  if (!isCorrect) throw new AppError(`Incorrect email or password`, 401);

  await createAndSendToken(user, 200, res);
});

// AUTHENTICATION
// Check if user is login to access certain routes
exports.protect = asyncMiddlewareFunctionExceptionHandler(
  async (req, res, next) => {
    let token;

    // 1. Check if there is BEARER token
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bear')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token)
      throw new AppError(
        'You are not logged in! Please log in to get access',
        401
      );

    // 2. Verification token
    // If token is invalid, jwt.verify throw an exception
    const payload = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET_KEY
    );

    // 3. Check if user still exists
    const userID = payload.id;
    const user = await User.findById(userID);
    if (!user)
      throw new AppError(`The user with this token no longer exist!`, 401);

    // 4. Check if user changed password after the token was issued
    if (user.isChangedPasswordAfterJWTIsIssued(payload.iat))
      throw new AppError(
        'User have already changed the password! Please login again',
        401
      );

    // CONGRATS! 👏 YOU HAVE GRANTED ACCESS TO PROTECTED ROUTE
    req.user = user;
    res.locals.user = user; // put user into res.locals to render
    next();
  }
);

// AUTHORIZATION
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      throw new AppError(
        'You do not have permission to perform this action',
        403
      );

    next();
  };
};

exports.forgotPassword = asyncMiddlewareFunctionExceptionHandler(
  async (req, res) => {
    // 1) Check user email
    const { email } = req.body;
    if (!email) throw new AppError('Please provide an email address', 400);

    const user = await User.findOne({ email });

    if (!user)
      throw new AppError(
        `The user with that email address does not exist`,
        404
      );

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    try {
      const resetURL = `${req.protocol}://${req.get(
        'host'
      )}/resetPassword/${resetToken}`;
      await new Email(user, resetURL).sendPasswordReset();
      res.status(200).json({
        status: 'success',
        message: 'Token sent to your email!'
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetTokenExpiredTime = undefined;

      await user.save({ validateBeforeSave: false });

      throw new AppError(
        'Something went wrong with our email service! Please try again later',
        500
      );
    }
  }
);

exports.resetPassword = asyncMiddlewareFunctionExceptionHandler(
  async (req, res) => {
    console.log(req.body);
    // 1) Get user base on the reset password token
    const rawResetToken = req.params.resetPasswordToken;

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawResetToken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpiredTime: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) throw new AppError('Token is invalid or has expired', 400);

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiredTime = undefined;
    await user.save();

    // 3) Update changedPasswordAt property for the user
    // Auto using pre 'save' hook

    // 4) Log the user in, send JWT
    await createAndSendToken(user, 200, res);
  }
);

exports.updatePassword = asyncMiddlewareFunctionExceptionHandler(
  async (req, res) => {
    // 1) Get user from database
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed password is correct
    const { currentPassword, newPassword, newPasswordConfirm } = req.body;

    const isCorrect = await user.isCorrectPassword(
      currentPassword,
      user.password
    );
    if (!isCorrect) throw new AppError('Incorrect current password!', 401);

    // 3) If so, update password
    user.password = newPassword;
    user.passwordConfirm = newPasswordConfirm;
    await user.save();

    // 4) Log user in, send JWT
    await createAndSendToken(user, 200, res);
  }
);

exports.isUserLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const payload = await util.promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET_KEY
      );

      const userID = payload.id;
      const user = await User.findById(userID);

      if (!user) return next();
      if (user.isChangedPasswordAfterJWTIsIssued(payload.iat)) return next();

      res.locals.user = user;
      return next();
    } catch (err) {
      return next();
    }
  }

  // There is no loggin user
  next();
};

exports.loggout = (req, res) => {
  // To loggout mean to delete cookie in browser
  // Send a dummy cookie with the same name to override the cookie currently saved in browser
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};
