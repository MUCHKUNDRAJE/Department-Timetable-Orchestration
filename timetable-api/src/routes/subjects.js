'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ───────────────────────────────────────
function toSubject(row) {
  return {
    id:           row.id,
    name:         row.name,
    code:         row.code,
    abbreviation: row.abbreviation || undefined,
    type:         row.type,
    credits:      row.credits !== null && row.credits !== undefined ? Number(row.credits) : 3,
    color:        row.color,
    department:   row.department,
    semester:     row.semester,
  };
}

// ─── Validators ────────────────────────────────────────────────────
const subjectValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('code').trim().notEmpty().withMessage('code is required'),
  body('abbreviation').optional({ nullable: true }).trim(),
  body('type').isIn(['lecture', 'lab']).withMessage('type must be lecture|lab'),
  body('credits').optional({ nullable: true }).isInt({ min: 1, max: 4 }).withMessage('credits must be between 1 and 4'),
  body('color').trim().notEmpty().withMessage('color is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('semester must be 1-8'),
];

// GET /api/subjects
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM subjects ORDER BY semester, code', []);
    res.json({ success: true, data: result.rows.map(toSubject) });
  } catch (err) { next(err); }
});

// POST /api/subjects
router.post('/', subjectValidators, validate, async (req, res, next) => {
  try {
    const { name, code, abbreviation, type, credits, color, department, semester } = req.body;
    const id = req.body.id || `subj_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
    const parsedCredits = credits !== undefined && credits !== null ? Math.min(4, Math.max(1, parseInt(credits, 10) || 3)) : 3;
    const result = await db.query(
      `INSERT INTO subjects (id, name, code, abbreviation, type, credits, color, department, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, name.trim(), code.trim().toUpperCase(), abbreviation ? abbreviation.trim() : null, type, parsedCredits, color.trim(), department.trim(), semester]
    );
    res.status(201).json({ success: true, data: toSubject(result.rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/subjects/:id
router.put('/:id', subjectValidators, validate, async (req, res, next) => {
  try {
    const { name, code, abbreviation, type, credits, color, department, semester } = req.body;
    const parsedCredits = credits !== undefined && credits !== null ? Math.min(4, Math.max(1, parseInt(credits, 10) || 3)) : 3;
    const result = await db.query(
      `UPDATE subjects
       SET name=$2, code=$3, abbreviation=$4, type=$5, credits=$6, color=$7, department=$8, semester=$9, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), code.trim().toUpperCase(), abbreviation ? abbreviation.trim() : null, type, parsedCredits, color.trim(), department.trim(), semester]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Subject not found.' });
    res.json({ success: true, data: toSubject(result.rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM subjects WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Subject not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

module.exports = router;
