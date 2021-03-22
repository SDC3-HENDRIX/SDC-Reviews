const { MongoClient } = require('mongodb');
const connectionURL = 'mongodb://localhost:27017/reviews';

const pipeline_characteristics = [
  {
    "$lookup": {
      "from": "characteristics",
      "localField": "characteristic_id",
      "foreignField": "id",
      "as": "characteristics"
    }
  },
  { 
    "$unwind": '$characteristics' 
  },
  { 
    "$replaceRoot": { 
      "newRoot": {
        "$mergeObjects": [
          {"characteristics_name": "$characteristics.name"},
          {"review_id": "$review_id"},
          {"value": "$value"},
          {"characteristic_id": "$characteristic_id"}
        ]
      }
    }
  },
  {
    "$group": {
      "_id": "$review_id",
      "characteristics": { 
        "$push": {
          "$mergeObjects": [
            {"characteristic_id": "$characteristic_id"},
            {"characteristics_name": "$characteristics_name"},
            {"value": "$value"}
          ]
        }
      }
    }
  },
  {
    "$out": "testing_aggregation_characteristics"
  }
]

MongoClient.connect(connectionURL, {poolSize: 10, bufferMaxEntries: 0, reconnectTries: 5000, useNewUrlParser: true,useUnifiedTopology: true}, function (err, client) {
  getReviewsID(19092, client);
});

const getReviewsID = function(productID, client) {
  let db = client.db('reviews');
  let reviews = db.collection('reviews');
  reviews.aggregate([
    { '$match': { 
      'product_id': productID
    }},
    {
      '$project': {
        '_id': 0,
        'id': 1
      }
    }
  ]).toArray()
    .then(res => {
      let characteristics_reviews = db.collection('characteristics_reviews');
      let count = res.length;
      let executingCall = 0;
      let multipleQ = [];
      res.forEach(review => {
        characteristics_reviews.aggregate([
          {
            '$match': {
              'review_id': review.id
            }
          },
          {
            '$lookup': {
              'from': "characteristics",
              'localField': "characteristic_id",
              'foreignField': "id",
              'as': "characteristics"
            }
          },
          { 
            '$unwind': '$characteristics' 
          },
          { 
            '$replaceRoot': { 
              'newRoot': {
                '$mergeObjects': [
                  {"characteristics_name": "$characteristics.name"},
                  {"review_id": "$review_id"},
                  {"value": "$value"},
                  {"characteristic_id": "$characteristic_id"}
                ]
              }
            }
          },
          {
            '$group': {
              '_id': "$review_id",
              'characteristics': { 
                '$push': {
                  '$mergeObjects': [
                    {"characteristic_id": "$characteristic_id"},
                    {"characteristics_name": "$characteristics_name"},
                    {"value": "$value"}
                  ]
                }
              }
            }
          }
        ]).toArray()
          .then(result => {
            multipleQ.push(result[0]);
            executingCall += 1;
            if (executingCall === count) {
              let aggregation_characteristics = db.collection('testing_aggregation_characteristics');
              aggregation_characteristics.insertMany(multipleQ)
                .then(() => {
                  client.close();
                })
            }
          })
      });
      console.log(multipleQ);
    }).catch(err => {
      console.log("Error: Damn so sad.", err)
    })
};