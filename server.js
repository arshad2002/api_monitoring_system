const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const monitorRoutes = require('./routes/monitorRoutes');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// HTTP request logging via morgan — stream output through winston
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
  })
);

// Serve static frontend files from the 'public' folder
app.use(express.static('public'));

// Mount API Routes
app.use('/', monitorRoutes);

// Environment variables & Database connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/api_monitor';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    logger.info('Successfully connected to MongoDB');
    app.listen(PORT, () => {
      logger.info(`Server is running and listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Database connection error', err);
    process.exit(1);
  });