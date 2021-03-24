const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const Schema = mongoose.Schema;

let characteristicsSchema = new Schema({
  characteristic_id: {type: Number, required: true},
  value: {type: Number, required: true}
});

let reviewSchema = new Schema({
  id: {type: Number, required: true},
  product_id: {type: Number, required: true},
  rating: {type: Number, required: true},
  date: {type: String, required: true},
  summary: {type: String, required: true},
  body: {type: String, required: true},
  recommend: Number,
  reported: {type: Number, required: true, default: 0},
  reviewer_name: {type: String, required: true},
  reviewer_email: {type: String, required: true},
  response: {type: String, default: ''},
  helpfulness: Number,
  characteristics_reviews: [characteristicsSchema],
  photos: [String]
});

reviewSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('reviewSchema', reviewSchema, 'testing_aggregation_final');