/**
 * servers/rest-server.js
 *
 * Mock REST backend for the Retro Trading Terminal. Express on port 4000,
 * CORS enabled, all JSON. Endpoints (per docs/ARCHITECTURE.md):
 *
 *   GET /api/init                          -> InitResponse (~200ms simulated latency)
 *   GET /api/reports/:reportId             -> ReportPayload (current snapshot)
 *   GET /api/reports/:reportId/eod?date=   -> ReportPayload (deterministic per-date rows)
 *   GET /api/eod-dates                     -> { dates: string[] }
 *
 * Unknown reportId -> 404 { error: 'Unknown report: <id>' }.
 *
 * Run: node servers/rest-server.js
 */

import express from 'express';
import cors from 'cors';
import {
  userData,
  menuData,
  eodDates,
  getReport,
  mutateRowsForDate,
} from './data/mockData.js';

const PORT = 4000;
const INIT_LATENCY_MS = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const app = express();
app.use(cors());

/* Concise request logging: METHOD path -> status (ms). */
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.log(
      `[rest] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`,
    );
  });
  next();
});

/** GET /api/init — user, menu tree and EOD dates, with simulated latency. */
app.get('/api/init', (_req, res) => {
  setTimeout(() => {
    res.json({ userData, menuData, eodDates });
  }, INIT_LATENCY_MS);
});

/** GET /api/eod-dates — available EOD dates, newest first. */
app.get('/api/eod-dates', (_req, res) => {
  res.json({ dates: eodDates });
});

/** GET /api/reports/:reportId/eod?date=YYYY-MM-DD — deterministic EOD rows. */
app.get('/api/reports/:reportId/eod', (req, res) => {
  const { reportId } = req.params;
  const report = getReport(reportId);
  if (!report) {
    res.status(404).json({ error: `Unknown report: ${reportId}` });
    return;
  }
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    res.status(400).json({ error: `Invalid or missing date parameter: ${date || '(none)'}` });
    return;
  }
  res.json({
    reportId,
    columns: report.columns,
    rows: mutateRowsForDate(report.rows, date),
    asOf: date, // for EOD, asOf is the selected date (contract)
  });
});

/** GET /api/reports/:reportId — current snapshot of a report. */
app.get('/api/reports/:reportId', (req, res) => {
  const { reportId } = req.params;
  const report = getReport(reportId);
  if (!report) {
    res.status(404).json({ error: `Unknown report: ${reportId}` });
    return;
  }
  res.json({
    reportId,
    columns: report.columns,
    rows: report.rows,
    asOf: new Date().toISOString(),
  });
});

/* Fallback 404 for anything else. */
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.listen(PORT, () => {
  console.log(`[rest] mock REST server listening on http://localhost:${PORT}`);
});
