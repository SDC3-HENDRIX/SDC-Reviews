const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const port = 3000;
mongoose.connect('mongodb://localhost/test', {useNewUrlParser: true, useUnifiedTopology: true});

app.use(express.json())
app.use(morgan('tiny'));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('WE ARE CONNECTED!!');
  // we're connected!
});