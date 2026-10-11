const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const monitorRoutes = require('./routes/monitorRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static frontend files from the 'public' folder
app.use(express.static('public'));

// Mount API Routes
app.use('/', monitorRoutes);

// Environment variables & Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/api_monitor';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running and listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });