'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs express-validator results and short-circuits with 400 if invalid.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: errors.array().map((e) => `${e.path}: ${e.msg}`),
    });
  }
  next();
}

module.exports = validate;
