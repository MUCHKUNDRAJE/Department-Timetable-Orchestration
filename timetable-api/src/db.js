'use strict';
require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
