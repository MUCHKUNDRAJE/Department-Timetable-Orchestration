'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ───────────────────────────────────────
function toClass(row) {
  return {
    id:           row.id,
    name:         row.name,
    department:   row.department,
    semester:     row.semester,
    section:      row.section,
    studentCount: row.student_count,
  };
}

// ─── Validators ────────────────────────────────────────────────────
const classValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('semester must be 1-8'),
  body('section').trim().notEmpty().withMessage('section is required'),
  body('studentCount').optional().isInt({ min: 1 }).withMessage('studentCount must be a positive integer'),
];

// GET /api/classes
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM classes ORDER BY semester, section, name', []);
    res.json({ success: true, data: result.rows.map(toClass) });
  } catch (err) { next(err); }
});

// POST /api/classes
router.post('/', classValidators, validate, async (req, res, next) => {
  try {
    const { name, department, semester, section, studentCount = 60 } = req.body;
    const id = req.body.id || `class_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const result = await db.query(
      `INSERT INTO classes (id, name, department, semester, section, student_count)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name.trim(), department.trim(), semester, section.trim(), studentCount]
    );
    res.status(201).json({ success: true, data: toClass(result.rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/classes/:id
router.put('/:id', classValidators, validate, async (req, res, next) => {
  try {
    const { name, department, semester, section, studentCount } = req.body;
    const result = await db.query(
      `UPDATE classes
       SET name=$2, department=$3, semester=$4, section=$5, student_count=$6, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), department.trim(), semester, section.trim(), studentCount ?? 60]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Class not found.' });
    res.json({ success: true, data: toClass(result.rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/classes/:id  (cascade handled by FK ON DELETE CASCADE)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM classes WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Class not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

module.exports = router;
