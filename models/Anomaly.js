const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema({
  api_name: { type: String, required: true },
  response_time_ms: { type: Number, required: true },
  status_code: { type: Number, required: true },
  records_returned: { type: Number, required: true },
  anomaly_types: [{ type: String }], // e.g., ['HIGH_LATENCY', 'SERVER_ERROR', 'ZERO_RECORDS']
  ai_alert: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Anomaly', AnomalySchema);