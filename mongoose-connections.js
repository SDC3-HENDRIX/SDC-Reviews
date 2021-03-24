const mongoose = require('mongoose');

const connectionURL = 'mongodb://localhost/reviews';

mongoose.connect(connectionURL, {useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('WE ARE CONNECTED!!');
});

module.exports = db