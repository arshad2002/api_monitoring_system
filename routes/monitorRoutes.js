const express = require('express');
const router = express.Router();
const Anomaly = require('../models/Anomaly');
const { detectAnomalies } = require('../services/anomalyDetector');
const { generateAIAlert } = require('../services/aiAlertService');

// POST /monitor - Ingest batch logs, check anomalies, generate AI alerts, and store
router.post('/monitor', async (req, res) => {
  try {
    const apiLogs = req.body;
    
    if (!Array.isArray(apiLogs)) {
      return res.status(400).json({ error: 'Input must be an array of API objects.' });
    }

    // 1. Run Anomaly Detection Engine
    const detectedAnomalies = detectAnomalies(apiLogs);
    const savedAnomalies = [];

    // 2. Process each anomaly through AI and save to DB
    for (const item of detectedAnomalies) {
      const aiAlertText = await generateAIAlert(item);
      
      const newAnomaly = new Anomaly({
        api_name: item.api_name,
        response_time_ms: item.response_time_ms,
        status_code: item.status_code,
        records_returned: item.records_returned,
        anomaly_types: item.anomaly_types,
        ai_alert: aiAlertText
      });

      await newAnomaly.save();
      savedAnomalies.push(newAnomaly);
    }

    res.status(201).json({
      message: 'Batch processed successfully',
      total_received: apiLogs.length,
      anomalies_detected: savedAnomalies.length,
      data: savedAnomalies
    });
  } catch (err) {
    console.error('Error processing monitor batch:', err);
    res.status(500).json({ error: 'Internal server error during monitoring processing.' });
  }
});

// GET /alerts - Fetch active stored anomalies
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await Anomaly.find().sort({ timestamp: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to fetch active alerts.' });
  }
});

module.exports = router;