const express = require('express');
const morgan = require('morgan');
const moment = require('moment');
const axios = require('axios');
const executeETL = require('./mongodb-connections');
const mongooseConn = require('./mongoose-connections');
const reviewModel = require('./mongoose-model');

const app = express();
const port = 3000;

app.use(express.json())
app.use(morgan('tiny'));

app.get('/', (req, res) => {
  res.send('Hello World lul');
})

app.post('/reviews', (req, res) => {
  console.log('Body', req.body);
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
        console.log(review.id,' Saved in mongo database with mongoose');
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