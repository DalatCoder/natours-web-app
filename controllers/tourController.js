const multer = require('multer');
const sharp = require('sharp');

const Tour = require('../models/tourModel');
const asyncMiddlewareExceptionHandler = require('../utils/asyncExceptionHandler');
const AppError = require('../utils/appError');
const factory = require('./../controllers/factoryHandler');

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

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// upload.single('image') upload single file stored in image field
// upload.array('images', 3) upload maximum 3 file stored in images array

exports.resizeTourImages = asyncMiddlewareExceptionHandler(
  async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    // 1) Cover image
    const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(`public/img/tours/${imageCoverFilename}`);
    req.body.imageCover = imageCoverFilename; // Put the filename to req.body to update later

    // 2) Other images
    req.body.images = [];

    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(`public/img/tours/${filename}`);

        req.body.images.push(filename);
      })
    );

    next();
  }
);

// Middleware to add extra information to /top-5-best-cheap route
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,price,summary';

  next();
};

exports.checkExistedTourID = asyncMiddlewareExceptionHandler(
  async (req, res, next) => {
    const { id } = req.params;

    const tour = await Tour.findOne({ _id: id })
      .select('_id')
      .lean();

    if (!tour) throw new AppError(`Cannot find the tour with ID: ${id}`, 404);

    next();
  }
);

exports.getAllTours = factory.getAll(Tour);
exports.getTourById = factory.getOne(Tour, { path: 'reviews' });
exports.createNewTour = factory.createOne(Tour);
exports.updateTourById = factory.updateOne(Tour);
exports.deleteTourById = factory.deleteOne(Tour);

exports.getTourStatistics = asyncMiddlewareExceptionHandler(
  async (req, res) => {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } }
      },
      {
        $group: {
          _id: { $toUpper: '$difficulty' },
          totalTours: { $sum: 1 },
          totalRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $sort: { avgPrice: 1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  }
);

exports.getMonthlyPlan = asyncMiddlewareExceptionHandler(async (req, res) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        totalTours: { $sum: 1 },
        tours: { $push: '$name' },
        totalPrice: { $sum: '$price' }
      }
    },
    // {
    //   $addField: { month: '$_id' }
    //   $addField is not allowed in this atlas tier
    // }
    {
      $sort: {
        totalTours: -1
      }
    }
    // {
    //   $limit: 5
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// /tours-within-radius/:distance/center/:coordinate/unit/:unit
// /tours-within-radius/200/center/50,59/unit/mi
exports.getToursWithin = asyncMiddlewareExceptionHandler(
  async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
      throw new AppError(
        'Please provide latitute and longitude in the format lat,lng.',
        400
      );
    }

    const tours = await Tour.find({
      startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        data: tours
      }
    });
  }
);

exports.getDistances = asyncMiddlewareExceptionHandler(
  async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if (!lat || !lng) {
      throw new AppError(
        'Please provide latitute and longitude in the format lat,lng.',
        400
      );
    }

    const distances = await Tour.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [lng * 1, lat * 1]
          },
          distanceField: 'distance',
          distanceMultiplier: multiplier
        }
      },
      {
        $project: {
          distance: 1,
          name: 1
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        data: distances
      }
    });
  }
);
