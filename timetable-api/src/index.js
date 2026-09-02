'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

// ─── Route modules ────────────────────────────────────────────────────
const authRouter        = require('./routes/auth');
const classesRouter     = require('./routes/classes');
const labsRouter        = require('./routes/labs');
const roomsRouter       = require('./routes/rooms');
const subjectsRouter    = require('./routes/subjects');
const facultyRouter     = require('./routes/faculty');
const assignmentsRouter = require('./routes/assignments');
const dataRouter        = require('./routes/data');
const { requireAuth }   = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Global Security Middleware ───────────────────────────────────────
app.use(helmet());

// Dynamic CORS configuration (supports comma-separated origins)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// General API Rate Limiting (500 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' },
});
app.use('/api/', apiLimiter);

// Strict Auth Rate Limiting (25 signup/login attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts. Please try again after 15 minutes.' },
});

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// ─── API Routes ───────────────────────────────────────────────────────
// Public Auth routes with strict brute-force rate limiter
app.use('/api/auth', authLimiter, authRouter);

// Protected Timetable API Routes
app.use('/api/classes',     requireAuth, classesRouter);
app.use('/api/labs',        requireAuth, labsRouter);
app.use('/api/rooms',       requireAuth, roomsRouter);
app.use('/api/subjects',    requireAuth, subjectsRouter);
app.use('/api/faculty',     requireAuth, facultyRouter);
app.use('/api/assignments', requireAuth, assignmentsRouter);
app.use('/api/data',        requireAuth, dataRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Timetable API running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Env:    ${process.env.NODE_ENV || 'development'}\n`);

  try {
    const { query } = require('./db');
    await query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS is_recess BOOLEAN DEFAULT false;
      ALTER TABLE assignments ALTER COLUMN faculty_id DROP NOT NULL;
      ALTER TABLE assignments ALTER COLUMN subject_id DROP NOT NULL;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_teacher_id TEXT REFERENCES faculty(id) ON DELETE SET NULL;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS abbreviation TEXT;
      ALTER TABLE faculty ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::JSONB;
    `);
    console.log('[DB] Verified database schema for is_recess, class_teacher_id, abbreviation, and faculty roles.');
  } catch (err) {
    console.warn('[DB] Schema check notice:', err.message);
  }
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
