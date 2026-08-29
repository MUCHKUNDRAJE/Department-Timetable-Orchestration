'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ───────────────────────────────────────
function toLab(row) {
  return {
    id:         row.id,
    name:       row.name,
    capacity:   row.capacity,
    department: row.department,
    location:   row.location,
  };
}

// ─── Validators ────────────────────────────────────────────────────
const labValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('capacity').isInt({ min: 1 }).withMessage('capacity must be a positive integer'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('location').optional().trim(),
];

// GET /api/labs
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM labs ORDER BY name', []);
    res.json({ success: true, data: result.rows.map(toLab) });
  } catch (err) { next(err); }
});

// POST /api/labs
router.post('/', labValidators, validate, async (req, res, next) => {
  try {
    const { name, capacity, department, location } = req.body;
    const id = req.body.id || `lab_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const result = await db.query(
      `INSERT INTO labs (id, name, capacity, department, location)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, name.trim(), capacity, department.trim(), location?.trim() || null]
    );
    res.status(201).json({ success: true, data: toLab(result.rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/labs/:id
router.put('/:id', labValidators, validate, async (req, res, next) => {
  try {
    const { name, capacity, department, location } = req.body;
    const result = await db.query(
      `UPDATE labs
       SET name=$2, capacity=$3, department=$4, location=$5, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), capacity, department.trim(), location?.trim() || null]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Lab not found.' });
    res.json({ success: true, data: toLab(result.rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/labs/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM labs WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Lab not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

module.exports = router;
