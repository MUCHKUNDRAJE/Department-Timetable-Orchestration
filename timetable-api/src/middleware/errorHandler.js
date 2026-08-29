'use strict';

/**
 * Centralised error handler middleware.
 * Converts any unhandled error into a consistent JSON response.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log full stack in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ERROR]', err.stack || err);
  }

  // PostgreSQL unique-violation → 409 Conflict
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with this unique value already exists.',
      details: [err.detail || err.message],
    });
  }

  // PostgreSQL foreign-key violation → 400
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist.',
      details: [err.detail || err.message],
    });
  }

  // PostgreSQL check-constraint violation → 400
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Value violates a database constraint.',
      details: [err.detail || err.message],
    });
  }

  return res.status(status).json({
    success: false,
    error: message,
    details: [],
  });
}

module.exports = errorHandler;
