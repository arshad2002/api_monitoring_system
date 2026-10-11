# AI API Monitoring & Alert System

A Node.js + Express backend that **automatically monitors API responses, detects anomalies, and generates AI-powered human-readable alerts** using Google Gemini. Detected anomalies are stored in MongoDB and displayed on a clean, auto-refreshing frontend.

---

## Features

- **POST `/monitor`** — Ingest a batch of API log entries; anomalies are detected and an AI alert is generated for each one
- **GET `/alerts`** — Fetch all active (unresolved) anomalies
- **PATCH `/alerts/:id/resolve`** — Mark an alert as resolved/dismissed
- **Static JSON file ingestion** — Feed a local `.json` file directly via the included CLI script
- **Anomaly detection** — Flags HIGH_LATENCY, SERVER_ERROR, and ZERO_RECORDS conditions
- **AI alert generation** — Gemini LLM produces concise, professional incident messages
- **Structured logging** — Winston + Morgan log to console and `logs/` files
- **Frontend UI** — Tailwind-styled dashboard with anomaly type badges, resolve buttons, and auto-refresh

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | v18+ |
| npm | v8+ |
| MongoDB | Running locally on port `27017` **OR** a MongoDB Atlas URI |
| Google Gemini API Key | [Get one here](https://aistudio.google.com/app/apikey) |

---

## Setup & Installation

### 1. Clone / enter the project directory

```bash
cd api_monitoring_system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/api_monitor
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Note:** If you use MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

---

## Running the Server

### Standard start

```bash
npm start
```

### Development mode (auto-restarts on file changes — Node 18+)

```bash
npm run dev
```

The server will be available at: **http://localhost:5000**

You should see console output like:

```
[2026-10-11 10:45:00] INFO: Successfully connected to MongoDB
[2026-10-11 10:45:00] INFO: Server is running and listening on port 5000
```

---

## Using the System

### Option 1 — Static JSON file (CLI)

Use the built-in ingestion script to process a local JSON file:

```bash
# Uses the default sample file: data/sample_apis.json
npm run ingest

# Or specify your own file
node scripts/ingestFromFile.js path/to/your/api_logs.json
```

The JSON file must be an **array** of objects matching this shape:

```json
[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]
```

### Option 2 — POST request

Send a batch directly to the `/monitor` endpoint:

```bash
curl -X POST http://localhost:5000/monitor \
  -H "Content-Type: application/json" \
  -d '[
    { "api_name": "AppointmentAPI", "response_time_ms": 5500, "status_code": 500, "records_returned": 0 },
    { "api_name": "BillingAPI", "response_time_ms": 4200, "status_code": 200, "records_returned": 0 }
  ]'
```

### Option 3 — Frontend Dashboard

Open your browser at **http://localhost:5000**

The dashboard:
- Loads all active alerts on page load
- Auto-refreshes every 15 seconds
- Displays colour-coded anomaly type badges (`HIGH LATENCY`, `SERVER ERROR`, `ZERO RECORDS`)
- Shows the AI-generated alert message
- Lets you **resolve/dismiss** individual alerts with the ✓ Resolve button

---

## API Reference

### `POST /monitor`

Ingest a batch of API log objects, detect anomalies, generate AI alerts, and persist them.

**Request body:** Array of API log objects (all fields required)

| Field | Type | Description |
|---|---|---|
| `api_name` | string | Name of the monitored API |
| `response_time_ms` | number | Response time in milliseconds |
| `status_code` | number | HTTP status code returned |
| `records_returned` | number | Number of records in the response |

**Response `201`:**
```json
{
  "message": "Batch processed successfully",
  "total_received": 2,
  "anomalies_detected": 1,
  "data": [ ...saved anomaly documents ]
}
```

**Response `422`** (validation failure):
```json
{
  "error": "One or more entries failed validation.",
  "details": [{ "index": 0, "errors": ["Missing required field \"api_name\""] }]
}
```

---

### `GET /alerts`

Returns all **active** anomalies, sorted newest first.

**Response `200`:** Array of anomaly documents.

---

### `PATCH /alerts/:id/resolve`

Marks an alert as resolved (sets `isActive: false`).

**Response `200`:**
```json
{ "message": "Alert resolved successfully.", "data": { ...updated document } }
```

---

## Anomaly Detection Rules

| Condition | Flag |
|---|---|
| `response_time_ms > 3000` | `HIGH_LATENCY` |
| `status_code >= 400` | `SERVER_ERROR` |
| `status_code === 200` AND `records_returned === 0` | `ZERO_RECORDS` |

An API log entry is only saved to the database if **at least one** flag is triggered.

---

## Project Structure

```
api_monitoring_system/
├── data/
│   └── sample_apis.json        # Sample input file for testing
├── logs/
│   ├── combined.log            # All log levels (auto-generated)
│   └── error.log               # Errors only (auto-generated)
├── models/
│   └── Anomaly.js              # Mongoose schema
├── public/
│   └── index.html              # Frontend dashboard
├── routes/
│   └── monitorRoutes.js        # /monitor and /alerts endpoints
├── scripts/
│   └── ingestFromFile.js       # CLI file ingestion tool
├── services/
│   ├── aiAlertService.js       # Gemini AI alert generation
│   └── anomalyDetector.js      # Rule-based anomaly detection
├── utils/
│   └── logger.js               # Winston structured logger
├── .env.example                # Environment variable template
├── .gitignore
├── package.json
└── server.js                   # Express app entry point
```

---

## Logging

Logs are written to two places:

| Destination | Content |
|---|---|
| **Console** | Colorized, all levels |
| `logs/combined.log` | All levels (info, warn, error, http) |
| `logs/error.log` | Errors only |

To change the log level, set `LOG_LEVEL` in `.env` (e.g., `LOG_LEVEL=debug`).

