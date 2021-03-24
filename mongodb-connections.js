const { MongoClient } = require('mongodb');
const connectionURL = 'mongodb://localhost:27017/reviews'; // Change to IP later

const pipeline_getReviewsID = function(productID) {
  return(
  [
    { '$match': { 
      'product_id': productID
    }},
    {
      '$project': {
        '_id': 0,
        'id': 1
      }
    }
  ]);
};

const pipeline_process_characteristics = function(reviewID) {
  return (
    [
      {
        '$match': {
          'review_id': reviewID
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
    ]
  );
};

const pipeline_process_reviews_characteristics = function(reviewID) {
  return (
    [
      {
        '$match': {
          'id': reviewID
        }
      },
      {
        '$lookup': {
          'from': "testing_aggregation_characteristics",
          'localField': "id",
          'foreignField': "_id",
          'as': "characteristics_reviews"
        }
      },
      { 
        '$replaceRoot': { 
          'newRoot': {
            '$mergeObjects': [
              {"id": "$id"},
              {"product_id": "$product_id"},
              {"rating": "$rating"},
              {"date": "$date"},
              {"summary": "$summary"},
              {"body": "$body"},
              {"recommend": {'$toBool': "$recommend"}},
              {"reported": "$reported"},
              {"reviewer_name": "$reviewer_name"},
              {"reviewer_email": "$reviewer_email"},
              {"response": { $ifNull: ['', "$response" ]}},
              {"helpfulness": "$helpfulness"},
              {"characteristics_reviews": { '$arrayElemAt': [ "$characteristics_reviews.characteristics", 0 ] } }
            ]
          }
        }
      },
      {
        '$sort': {
          '_id': 1
        }
      }
    ]
  );
};

const pipeline_process_reviews_photos = function(reviewID) {
  return(
    [
      {
        '$match': {
          'id': reviewID
        }
      },
      {
        '$lookup':  {
          'from': "testing_aggregation_photos",
          'localField': "id",
          'foreignField': "_id",
          'as': "photos"
        }
      },
      { 
        '$replaceRoot': { 
          'newRoot': {
            '$mergeObjects': [
              {"id": "$id"},
              {"product_id": "$product_id"},
              {"rating": "$rating"},
              {"date": "$date"},
              {"summary": "$summary"},
              {"body": "$body"},
              {"recommend": "$recommend"},
              {"reported": "$reported"},
              {"reviewer_name": "$reviewer_name"},
              {"reviewer_email": "$reviewer_email"},
              {"response": "$response"},
              {"helpfulness": "$helpfulness"},
              {"characteristics_reviews": "$characteristics_reviews"},
              {"photos": { '$arrayElemAt': [ "$photos.url", 0 ] }}
            ]
          }
        }
      },
      {
        '$sort': {
          _id: 1
        }
      }
    ]
  );
};

const processCharacteristics = function(res, client) {
  let db = client.db('reviews');
  let characteristics_reviews = db.collection('characteristics_reviews');
  let count = res.length;
  let executingCallCharacteristics = 0;
  let multipleQCharacteristics = [];
  res.forEach(review => {
    // console.log('Review ID', review.id);
    characteristics_reviews.aggregate(pipeline_process_characteristics(review.id)).toArray()
      .then(result => {
        multipleQCharacteristics.push(result[0]);
        executingCallCharacteristics += 1;
        if (executingCallCharacteristics === count) {
          let aggregation_characteristics = db.collection('testing_aggregation_characteristics');
          // console.log(multipleQCharacteristics)
          aggregation_characteristics.insertMany(multipleQCharacteristics)
            .then(() => {
              processReviewsWCharacteristics(res, client)
          })
        }
      })
  });
};

const processReviewsWCharacteristics = function(res, client) {
  let db = client.db('reviews');
  let reviews = db.collection('reviews');
  let count = res.length;
  let executingCallReviewsP1 = 0;
  let multipleQReviews = [];
  res.forEach(reviewID => {
    // console.log('2nd ReviewID ', reviewID.id);
    reviews.aggregate(pipeline_process_reviews_characteristics(reviewID.id)).toArray()
      .then(result => {
        multipleQReviews.push(result[0]);
        executingCallReviewsP1 += 1;
        if(executingCallReviewsP1 === count) {
          let aggregation_reviews = db.collection('testing_aggregation_review_part1');
          // console.log(multipleQReviews);
          aggregation_reviews.insertMany(multipleQReviews)
            .then(()=> {
              processReviewsWPhotos(res, client)
            })
        }
      })
  })
};

const processReviewsWPhotos = function(res, client) {
  let db = client.db('reviews');
  let count = res.length;
  let executingCallReviewsP2 = 0;
  let multipleQReviews2 = [];
  let aggregation_reviews = db.collection('testing_aggregation_review_part1');
  res.forEach(reviewID => {
    // console.log('3rd ReviewID', reviewID.id);
    aggregation_reviews.aggregate(pipeline_process_reviews_photos(reviewID.id)).toArray()
      .then(result => {
        multipleQReviews2.push(result[0]);
        executingCallReviewsP2 += 1;
        if(executingCallReviewsP2 === count) {
          // console.log(multipleQReviews2);
          let aggregation_reviews_final = db.collection('testing_aggregation_final');
          aggregation_reviews_final.insertMany(multipleQReviews2)
            .then(() => {
              client.close(); // END
            })
        }
      })
  })
};

const collectionProcessor = function(productID, client) {
  let db = client.db('reviews');
  let reviews = db.collection('reviews');
  console.log('Product ID', productID);
  reviews.aggregate(pipeline_getReviewsID(productID)).toArray()
    .then(res => {
      processCharacteristics(res, client);
    }).catch(err => {
      console.log("Error: Damn so sad.", err)
    })
};

const executeETL = function(productID) {
  MongoClient.connect(connectionURL, {poolSize: 10, bufferMaxEntries: 0, reconnectTries: 5000, useNewUrlParser: true,useUnifiedTopology: true}, function (err, client) {
    collectionProcessor(productID, client);
  });
};

module.exports = executeETL;