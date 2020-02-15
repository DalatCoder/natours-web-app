const AppError = require('../utils/appError');

const handleCastErrorDatabase = err => {
  const message = `Invalid "${err.path}": "${err.value}"`;
  return new AppError(message, 400);
};

const handleDuplicatedKeyErrorDatabase = err => {
  const key = Object.keys(err.keyValue)[0];
  const message = `The tour with the "${key}" equal to "${err.keyValue[key]}" have already exist!`;
  return new AppError(message, 400);
};

const handleValidationErrorDatabase = err => {
  const { errors } = err;
  let message = '';

  const keys = Object.keys(errors);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (errors[key].name === 'CastError') {
      return handleCastErrorDatabase(errors[key]);
    }

    message += errors[key].message;
    message += '. ';
  }

  return new AppError(message, 400);
};

const handleJWTException = () => {
  return new AppError('Invalid token! Please login again', 401);
};

const handleJWTExpiredException = () => {
  return new AppError(
    'Your token have already expired! Please login again',
    401
  );
};

const sendErrorDevForAPI = (err, req, res) => {
  console.error('ERROR: 💥', err); // Log the error for fixing later

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};
const sendErrorDevForRender = (err, req, res) => {
  console.error('ERROR: 💥', err); // Log the error for fixing later

  // Render error page
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const responseErrorForDevelopment = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    sendErrorDevForAPI(err, req, res);
  } else {
    sendErrorDevForRender(err, req, res);
  }
};

const sendErrorProdForAPI = (err, req, res) => {
  // Only send the error that we have known
  // For other unexpected errors, just send genenal error message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  } else {
    console.error('ERROR: 💥', err); // Log the error for fixing later

    res.status(500).json({
      status: 'error',
      message: 'Oops! Something went wrong! :('
    });
  }
};
const sendErrorProdForRender = (err, req, res) => {
  // Render error page
  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  } else {
    res.status(500).render('error', {
      title: 'Something went wrong!',
      msg: 'Oops! Something went wrong! :('
    });
  }
};

const responseErrorForProduction = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    sendErrorProdForAPI(err, req, res);
  } else {
    sendErrorProdForRender(err, req, res);
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    responseErrorForDevelopment(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Classify exception to give meaningful message
    switch (err.name) {
      case 'CastError':
        error = handleCastErrorDatabase(err);
        break;

      case 'ValidationError':
        error = handleValidationErrorDatabase(err);
        break;

      case 'MongoError':
        if (err.code === 11000) {
          error = handleDuplicatedKeyErrorDatabase(err);
        }
        break;

      case 'JsonWebTokenError':
        error = handleJWTException();
        break;

      case 'TokenExpiredError':
        error = handleJWTExpiredException();
        break;

      default:
        break;
    }

    responseErrorForProduction(error, req, res);
  }
};
