'use strict';
require('dotenv').config();

const { Pool } = require('pg');

const dbUrl = (process.env.DATABASE_URL || '').trim();
const isCloudDb = dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error:', err.message);
});

/**
 * Execute a parameterised query using the shared pool.
 * @param {string} text  – SQL statement
 * @param {any[]}  params – Bound parameters
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DB] query (${duration}ms) rows=${res.rowCount}`);
  }
  return res;
}

/**
 * Get a client from the pool for transaction usage.
 * Caller is responsible for releasing it.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
