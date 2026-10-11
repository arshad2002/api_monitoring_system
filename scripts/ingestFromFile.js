#!/usr/bin/env node
/**
 * Static JSON File Ingestion Script (Fix #2)
 * -------------------------------------------
 * Reads a local JSON file of API logs and submits them to the /monitor endpoint.
 *
 * Usage:
 *   node scripts/ingestFromFile.js [path/to/file.json]
 *
 * Default file: ./data/sample_apis.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const filePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '../data/sample_apis.json');

const PORT = process.env.PORT || 5000;

function readJsonFile(fp) {
  if (!fs.existsSync(fp)) {
    console.error(`[INGEST] File not found: ${fp}`);
    process.exit(1);
  }
  try {
    const raw = fs.readFileSync(fp, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error(`[INGEST] Failed to parse JSON: ${e.message}`);
    process.exit(1);
  }
}

function postData(payload) {
  const body = JSON.stringify(payload);

  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/monitor',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('\n[INGEST] ✅ Server response:');
        console.log(`  Total received   : ${result.total_received}`);
        console.log(`  Anomalies found  : ${result.anomalies_detected}`);
        if (result.data && result.data.length > 0) {
          console.log('\n[INGEST] Detected alerts:');
          result.data.forEach((a, i) => {
            console.log(`  ${i + 1}. [${a.api_name}] ${a.ai_alert}`);
          });
        }
      } catch {
        console.log('[INGEST] Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`[INGEST] ❌ Request failed: ${e.message}`);
    console.error('[INGEST] Make sure the server is running on port', PORT);
  });

  req.write(body);
  req.end();
}

const apiLogs = readJsonFile(filePath);

if (!Array.isArray(apiLogs)) {
  console.error('[INGEST] JSON file must contain an array of API log objects.');
  process.exit(1);
}

console.log(`[INGEST] Reading from: ${filePath}`);
console.log(`[INGEST] Submitting ${apiLogs.length} API log(s) to server...`);
postData(apiLogs);

