const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');
const { detectAnomalies } = require('../services/anomalyDetector');
const { generateAIAlert } = require('../services/aiAlertService');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────
// Helper: validate a single API log entry (Fix #5)
// ─────────────────────────────────────────────
const REQUIRED_FIELDS = ['api_name', 'response_time_ms', 'status_code', 'records_returned'];

function validateApiLog(entry, index) {
  const errors = [];

  REQUIRED_FIELDS.forEach((field) => {
    if (entry[field] === undefined || entry[field] === null) {
      errors.push(`Missing required field "${field}"`);
    }
  });

  if (typeof entry.api_name !== 'undefined' && typeof entry.api_name !== 'string') {
    errors.push('"api_name" must be a string');
  }
  if (typeof entry.response_time_ms !== 'undefined' && typeof entry.response_time_ms !== 'number') {
    errors.push('"response_time_ms" must be a number');
  }
  if (typeof entry.status_code !== 'undefined' && typeof entry.status_code !== 'number') {
    errors.push('"status_code" must be a number');
  }
  if (typeof entry.records_returned !== 'undefined' && typeof entry.records_returned !== 'number') {
    errors.push('"records_returned" must be a number');
  }

  return errors.length > 0 ? { index, errors } : null;
}

router.post('/monitor', async (req, res) => {
  try {
    const apiLogs = req.body;

    if (!Array.isArray(apiLogs)) {
      return res.status(400).json({ error: 'Input must be an array of API log objects.' });
    }

    if (apiLogs.length === 0) {
      return res.status(400).json({ error: 'Input array must not be empty.' });
    }

    // Fix #5 — validate every entry before processing
    const validationErrors = [];
    apiLogs.forEach((entry, idx) => {
      const result = validateApiLog(entry, idx);
      if (result) validationErrors.push(result);
    });

    if (validationErrors.length > 0) {
      logger.warn(`Validation failed for ${validationErrors.length} entries in batch`);
      return res.status(422).json({
        error: 'One or more entries failed validation.',
        details: validationErrors,
      });
    }

    logger.info(`Processing batch of ${apiLogs.length} API log(s)`);

    // 1. Run Anomaly Detection Engine
    const detectedAnomalies = detectAnomalies(apiLogs);
    logger.info(`Anomalies detected: ${detectedAnomalies.length}`);

    const savedAnomalies = [];

    // 2. Process each anomaly through AI and save to DB
    for (const item of detectedAnomalies) {
      const aiAlertText = await generateAIAlert(item);

      const newAnomaly = new Anomaly({
        api_name:         item.api_name,
        response_time_ms: item.response_time_ms,
        status_code:      item.status_code,
        records_returned: item.records_returned,
        anomaly_types:    item.anomaly_types,
        ai_alert:         aiAlertText,
        isActive:         true,
      });

      await newAnomaly.save();
      logger.info(`Saved anomaly for "${item.api_name}" → ${item.anomaly_types.join(', ')}`);
      savedAnomalies.push(newAnomaly);
    }

    res.status(201).json({
      message: 'Batch processed successfully',
      total_received: apiLogs.length,
      anomalies_detected: savedAnomalies.length,
      data: savedAnomalies,
    });
  } catch (err) {
    logger.error('Error processing monitor batch', err);
    res.status(500).json({ error: 'Internal server error during monitoring processing.' });
  }
});


router.get('/alerts', async (req, res) => {
  try {
    // Only return alerts where isActive is true
    const alerts = await Anomaly.find({ isActive: true }).sort({ timestamp: -1 });
    logger.info(`Fetched ${alerts.length} active alert(s)`);
    res.json(alerts);
  } catch (err) {
    logger.error('Error fetching alerts', err);
    res.status(500).json({ error: 'Failed to fetch active alerts.' });
  }
});


router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await Anomaly.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    logger.info(`Alert "${alert.api_name}" (${alert._id}) resolved`);
    res.json({ message: 'Alert resolved successfully.', data: alert });
  } catch (err) {
    logger.error('Error resolving alert', err);
    res.status(500).json({ error: 'Failed to resolve alert.' });
  }
});

module.exports = router;