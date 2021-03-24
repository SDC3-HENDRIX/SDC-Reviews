const express = require('express');
const morgan = require('morgan');
const moment = require('moment');
const axios = require('axios');
const executeETL = require('./mongodb-connections');
const mongooseConn = require('./mongoose-connections');
const reviewModel = require('./mongoose-model');
const e = require('express');

const app = express();
const port = 3000;

app.use(express.json())
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.send('Hello World lul');
})

app.get('/reviews/meta', (req, res) => {
  let metadata = {
    ratings: {},
    recommended: {},
    characteristics: {}
  };
  let charCount = {};
  reviewModel.find({product_id: req.query.product_id})
    .then(reviews => {
      reviews.forEach(review => {
        if(!metadata.ratings[review.rating]) {
          metadata.ratings[review.rating] = 1;
        } else {
          metadata.ratings[review.rating] += 1;
        }

        if(!metadata.recommended[review.recommend.toString()]) {
          metadata.recommended[review.recommend.toString()] = 1;
        } else {
          metadata.recommended[review.recommend.toString()] += 1;
        }

        review.characteristics_reviews.forEach(char => {
          if(!metadata.characteristics[char.characteristic_id]) {
            metadata.characteristics[char.characteristic_id] = {id: char.characteristic_id, value: char.value};
            charCount[char.characteristic_id] = 1;
          } else {
            metadata.characteristics[char.characteristic_id].value += char.value;
            charCount[char.characteristic_id] += 1;
          }
        });
      });
      let characteristic_id = Object.keys(metadata.characteristics);
      characteristic_id.forEach(char => {
        metadata.characteristics[char].value = metadata.characteristics[char].value / charCount[char];
      });
      res.status(200).json(metadata);
    })
})

app.post('/reviews', (req, res) => {
  let id = 0;
  reviewModel.count({}, function (err, count) {
    if(err) { console.log('Error count', err)} 
    else { id = count + 1; }
  })
    .then(() => {
      let transformCharacteristics = function(characteristics) {
        let cArray = [];
        for(let c in characteristics) {
          cArray.push({characteristic_id: Number(c), value: characteristics[c]})
        }
        return cArray;
      }
      let newReview = reviewModel({...req.body, ...{
        date: moment(Date.now().toString()).format('YYYY-MM-DD') ,
        id: 7000000 + id, // DYNAMIC ID 
        reported: false,
        reviewer_name: req.body.name,
        reviewer_email: req.body.email,
        helpfulness: 0,
        characteristics_reviews: transformCharacteristics(req.body.characteristics),
      }})
    
      newReview.save(function(err, review){
        if(err){
          return console.log('Error on Mongoose', err);
        }
        res.status(201).send('Created');
      })
    })  
})

app.put('/reviews/:reviewID/report', (req, res) => {
  reviewModel.updateOne({id: req.params.reviewID}, {reported: 1})
    .then( () => {
      res.status(204).send('Reported');
    })
})

app.put('/reviews/:reviewID/helpful', (req, res) => {
  reviewModel.findOneAndUpdate(
    {id: req.params.reviewID}, 
    {$inc: {helpfulness: 1}}, 
    {new: true })
    .then(() => {
      res.status(204).send('Helpful');
    })
})

app.listen(port, () => {
  console.log('Listening in port: ', port);
})