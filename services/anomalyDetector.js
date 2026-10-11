function detectAnomalies(apiData) {
  const anomalies = [];

  apiData.forEach(item => {
    const issues = [];

    // Define monitoring thresholds
    if (item.response_time_ms > 3000) {
      issues.push('HIGH_LATENCY');
    }
    if (item.status_code >= 400) {
      issues.push('SERVER_ERROR');
    }
    if (item.status_code === 200 && item.records_returned === 0) {
      issues.push('ZERO_RECORDS');
    }

    // If any issue is found, flag it as an anomaly
    if (issues.length > 0) {
      anomalies.push({
        ...item,
        anomaly_types: issues
      });
    }
  });

  return anomalies;
}

module.exports = { detectAnomalies };