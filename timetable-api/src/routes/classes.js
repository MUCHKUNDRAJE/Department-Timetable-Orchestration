'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ───────────────────────────────────────
function toClass(row) {
  let batches = [];
  if (Array.isArray(row.batches)) {
    batches = row.batches;
  } else if (typeof row.batches === 'string') {
    try { batches = JSON.parse(row.batches); } catch (_) { batches = []; }
  }
  return {
    id:             row.id,
    name:           row.name,
    department:     row.department,
    semester:       row.semester,
    section:        row.section,
    studentCount:   row.student_count,
    classTeacherId: row.class_teacher_id || undefined,
    batches:        batches,
  };
}

// Helper: Generate standard 4 batches for a class
function getDefaultBatches(section = 'A', count = 64) {
  const sec = (section || 'A').trim().toUpperCase() || 'A';
  const total = Number(count) || 64;
  const size = Math.ceil(total / 4);
  return [
    { name: `${sec}1`, fromRollNo: 1, toRollNo: size },
    { name: `${sec}2`, fromRollNo: size + 1, toRollNo: size * 2 },
    { name: `${sec}3`, fromRollNo: size * 2 + 1, toRollNo: size * 3 },
    { name: `${sec}4`, fromRollNo: size * 3 + 1, toRollNo: total },
  ];
}

// ─── Validators ────────────────────────────────────────────────────
const classValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('semester must be 1-8'),
  body('section').trim().notEmpty().withMessage('section is required'),
  body('studentCount').optional().isInt({ min: 1 }).withMessage('studentCount must be a positive integer'),
  body('classTeacherId').optional({ nullable: true }).trim(),
  body('batches')
    .optional({ nullable: true })
    .isArray({ min: 4, max: 4 })
    .withMessage('Each class must have exactly 4 batches (e.g. A1, A2, A3, A4)'),
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
    const { name, department, semester, section, studentCount = 60, classTeacherId = null, batches } = req.body;
    const id = req.body.id || `class_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const finalBatches = Array.isArray(batches) && batches.length === 4
      ? batches
      : getDefaultBatches(section, studentCount);

    const result = await db.query(
      `INSERT INTO classes (id, name, department, semester, section, student_count, class_teacher_id, batches)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name.trim(), department.trim(), semester, section.trim(), studentCount, classTeacherId || null, JSON.stringify(finalBatches)]
    );
    res.status(201).json({ success: true, data: toClass(result.rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/classes/:id
router.put('/:id', classValidators, validate, async (req, res, next) => {
  try {
    const { name, department, semester, section, studentCount, classTeacherId, batches } = req.body;
    const finalBatches = Array.isArray(batches) && batches.length === 4
      ? batches
      : getDefaultBatches(section, studentCount || 60);

    const result = await db.query(
      `UPDATE classes
       SET name=$2, department=$3, semester=$4, section=$5, student_count=$6, class_teacher_id=$7, batches=$8, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), department.trim(), semester, section.trim(), studentCount ?? 60, classTeacherId || null, JSON.stringify(finalBatches)]
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
