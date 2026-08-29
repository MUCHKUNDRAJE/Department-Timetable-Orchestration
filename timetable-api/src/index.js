'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// ─── Route modules ────────────────────────────────────────────────────
const classesRouter     = require('./routes/classes');
const labsRouter        = require('./routes/labs');
const roomsRouter       = require('./routes/rooms');
const subjectsRouter    = require('./routes/subjects');
const facultyRouter     = require('./routes/faculty');
const assignmentsRouter = require('./routes/assignments');
const dataRouter        = require('./routes/data');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Global Middleware ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ─── API Routes ───────────────────────────────────────────────────────
// NOTE: assignments must be mounted BEFORE generic /:id routes are matched
// The router internally handles /target/:type/:id before /:id
app.use('/api/classes',     classesRouter);
app.use('/api/labs',        labsRouter);
app.use('/api/rooms',       roomsRouter);
app.use('/api/subjects',    subjectsRouter);
app.use('/api/faculty',     facultyRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/data',        dataRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Timetable API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────
const { pool } = require('./db');

function shutdown(signal) {
  console.log(`\n[${signal}] Gracefully shutting down...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('[DB] Pool closed.');
    } catch (err) {
      console.error('[DB] Error closing pool:', err.message);
    }
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { console.error('[UncaughtException]', err); shutdown('uncaughtException'); });
process.on('unhandledRejection', (reason) => { console.error('[UnhandledRejection]', reason); });
