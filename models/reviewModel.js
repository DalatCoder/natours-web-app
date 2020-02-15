const mongoose = require('mongoose');

const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true
    },
    rating: {
      type: Number,
      min: [1.0, 'Rating must at least 1.0'],
      max: [5.0, 'Rating cannot pass over 5.0'],
      default: 4.5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  }).select('-__v');

  next();
});

reviewSchema.statics.calcRatingsAverage = async function(tourID) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourID }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length === 0) {
    await Tour.findByIdAndUpdate(tourID, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  } else {
    await Tour.findByIdAndUpdate(tourID, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  }
};

reviewSchema.post('save', async function() {
  await this.constructor.calcRatingsAverage(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next) {
  // save current review to this (== query object) and then use it
  // in post 'findOneAnd' hook after all changed review data has been saved
  // to calculate rating average and rating quantity
  this.currentReview = await this.findOne();
  console.log(this.currentReview);

  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  // this.findOne does not work here because the query has already executed
  // Get review from this (query object) which we have saved in pre hook
  const review = this.currentReview;
  await review.constructor.calcRatingsAverage(review.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
