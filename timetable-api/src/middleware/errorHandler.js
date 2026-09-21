'use strict';

/**
 * Centralised error handler middleware.
 * Converts any unhandled error into a consistent JSON response.
 * NEVER exposes raw error messages or stack traces to the client in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Always log the full error server-side
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.stack || err);

  // PostgreSQL unique-violation → 409 Conflict
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with this unique value already exists.',
      details: isProd ? [] : [err.detail || err.message],
    });
  }

  // PostgreSQL foreign-key violation → 400
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist.',
      details: isProd ? [] : [err.detail || err.message],
    });
  }

  // PostgreSQL check-constraint violation → 400
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Value violates a database constraint.',
      details: isProd ? [] : [err.detail || err.message],
    });
  }

  // Generic error — never leak internal message in production
  return res.status(status).json({
    success: false,
    error: isProd && status >= 500 ? 'An internal server error occurred.' : (err.message || 'Internal Server Error'),
    details: [],
  });
}

module.exports = errorHandler;
