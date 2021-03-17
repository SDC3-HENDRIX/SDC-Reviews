const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(express.json())