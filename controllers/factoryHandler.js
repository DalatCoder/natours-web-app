const AppError = require('./../utils/appError');
const asyncMiddlewareExceptionHandler = require('./../utils/asyncExceptionHandler');
const MongooseUtilities = require('./../utils/DBUtils');
const filterObject = require('./../utils/filterObject');

exports.getAll = Model =>
  asyncMiddlewareExceptionHandler(async (req, res) => {
    // To allow for nested GET reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const apiUtilities = new MongooseUtilities(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitPages()
      .paginate();

    const docs = await apiUtilities.mongooseQuery;

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs
      }
    });
  });

exports.getOne = (Model, populateOptions) =>
  asyncMiddlewareExceptionHandler(async (req, res) => {
    const { id } = req.params;
    let queryObject = Model.findById(id);

    if (populateOptions) queryObject = queryObject.populate(populateOptions);

    const doc = await queryObject;

    if (!doc) throw new AppError('Cannot find the document with that ID', 404);

    res.status(200).json({
      status: 'success',
      data: { data: doc }
    });
  });

exports.createOne = (Model, allowedFields) =>
  asyncMiddlewareExceptionHandler(async (req, res) => {
    let filteredBody = req.body;
    if (allowedFields) filteredBody = filterObject(req.body, allowedFields);

    const doc = await Model.create(filteredBody);

    res.status(201).json({
      status: 'success',
      data: { data: doc }
    });
  });

// Options is an object that contain fields which don't want to update
// If don't pass any allowedFields, then accept all
exports.updateOne = (Model, allowedFields) =>
  asyncMiddlewareExceptionHandler(async (req, res) => {
    let filteredBody = req.body;
    if (allowedFields) filteredBody = filterObject(req.body, allowedFields);

    const doc = await Model.findByIdAndUpdate(req.params.id, filteredBody, {
      new: true,
      runValidators: true
    });

    if (!doc) throw new AppError('Cannot find the document to update', 404);

    res.status(200).json({
      status: 'success',
      data: { data: doc }
    });
  });

exports.deleteOne = Model =>
  asyncMiddlewareExceptionHandler(async (req, res) => {
    const { id } = req.params;

    const doc = await Model.findByIdAndDelete(id);
    if (!doc) throw new AppError(`Cannot find the document to remove`, 404);

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
