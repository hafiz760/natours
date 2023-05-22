const mongoose = require('mongoose');
const Tour = require('./tourModel')
// const User = require('./userModel')
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Reviw cant be empty']
    },

    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a Tour ']
      
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a User ']
    }
  },   
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.pre('save', async function(next) {
  const existingReview = await this.constructor.findOne({
    tour: this.tour,
    user: this.user
  });

  if (existingReview) {
    const error = new Error('A review from this user already exists for this tour.');
    return next(error);
  }
  next();
});


reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'email photo'
  });
  next();
});

reviewSchema.statics.calAvgRating = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour', 
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);



    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  
};

reviewSchema.post('save',function(){
    this.constructor.calAvgRating(this.tour)
})






const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
