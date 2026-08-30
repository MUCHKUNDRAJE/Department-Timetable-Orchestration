'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: errors.array()[0].msg,
      details: errors.array(),
    });
  }
  next();
}

/**
 * POST /api/auth/signup
 * Register a new user account.
 */
router.post(
  '/signup',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long.')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username may only contain letters, numbers, hyphens, and underscores.'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('fullName')
      .optional()
      .trim(),
    handleValidation,
  ],
  async (req, res, next) => {
    try {
      const { username, password, fullName = '' } = req.body;
      const cleanUsername = username.toLowerCase().trim();

      // Check if username already exists
      const existing = await db.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
        [cleanUsername]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken. Please choose another one.',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Insert new user
      const result = await db.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id, username, full_name, role, created_at`,
        [cleanUsername, passwordHash, fullName.trim() || cleanUsername]
      );

      const user = result.rows[0];

      // Sign JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate with username and password.
 */
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.'),
    handleValidation,
  ],
  async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const cleanUsername = username.toLowerCase().trim();

      const result = await db.query(
        'SELECT id, username, password_hash, full_name, role FROM users WHERE LOWER(username) = LOWER($1)',
        [cleanUsername]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password.',
        });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid username or password.',
        });
      }

      // Sign JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/auth/me
 * Returns current authenticated user profile.
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    const u = result.rows[0];
    res.json({
      success: true,
      data: {
        user: {
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          role: u.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
