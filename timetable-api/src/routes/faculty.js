'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row + subject ids → camelCase ─────────────────────────
function toFaculty(row, subjectIds = []) {
  let roles = [];
  if (Array.isArray(row.roles)) {
    roles = row.roles;
  } else if (typeof row.roles === 'string') {
    try { roles = JSON.parse(row.roles); } catch (_) { roles = []; }
  }

  return {
    id:              row.id,
    name:            row.name,
    nickname:        row.nickname,
    department:      row.department,
    designation:     row.designation,
    roles,
    email:           row.email,
    maxWeeklyHours:  row.max_weekly_hours,
    subjectIds,
  };
}

// ─── Validators ────────────────────────────────────────────────────
const facultyValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('department').trim().notEmpty().withMessage('department is required'),
  body('designation').trim().notEmpty().withMessage('designation is required'),
  body('email').isEmail().withMessage('valid email is required'),
  body('maxWeeklyHours').optional().isInt({ min: 1, max: 40 }).withMessage('maxWeeklyHours must be 1-40'),
  body('subjectIds').optional().isArray().withMessage('subjectIds must be an array'),
  body('roles').optional().isArray().withMessage('roles must be an array'),
  body('nickname').optional().trim(),
];

// ─── GET /api/faculty ──────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const facResult = await db.query('SELECT * FROM faculty ORDER BY name', []);
    const fsResult  = await db.query('SELECT faculty_id, subject_id FROM faculty_subjects', []);

    // Group subject IDs by faculty
    const subjectMap = {};
    for (const row of fsResult.rows) {
      if (!subjectMap[row.faculty_id]) subjectMap[row.faculty_id] = [];
      subjectMap[row.faculty_id].push(row.subject_id);
    }

    res.json({
      success: true,
      data: facResult.rows.map((r) => toFaculty(r, subjectMap[r.id] || [])),
    });
  } catch (err) { next(err); }
});

// ─── POST /api/faculty ─────────────────────────────────────────────
router.post('/', facultyValidators, validate, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, nickname, department, designation, roles = [], email, maxWeeklyHours = 20, subjectIds = [] } = req.body;
    const id = req.body.id || `fac_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const validRoles = Array.isArray(roles) ? roles : [];

    // Designation validation: HOD (max 1) and Timetable Incharge (max 5)
    if (validRoles.includes('Head of Department (HOD)')) {
      const hodCheck = await client.query(
        `SELECT COUNT(*) FROM faculty WHERE roles @> '["Head of Department (HOD)"]'::jsonb`
      );
      if (parseInt(hodCheck.rows[0].count) >= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Only one faculty member can hold the Head of Department (HOD) designation at any given time.',
        });
      }
    }

    if (validRoles.includes('Timetable Incharge')) {
      const inchargeCheck = await client.query(
        `SELECT COUNT(*) FROM faculty WHERE roles @> '["Timetable Incharge"]'::jsonb`
      );
      if (parseInt(inchargeCheck.rows[0].count) >= 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Maximum limit of 5 faculty members can hold the Timetable Incharge designation at a time.',
        });
      }
    }

    const facResult = await client.query(
      `INSERT INTO faculty (id, name, nickname, department, designation, roles, email, max_weekly_hours)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name.trim(), nickname?.trim() || null, department.trim(), designation.trim(), JSON.stringify(validRoles), email.trim(), maxWeeklyHours]
    );

    // Insert faculty_subjects join rows
    const validIds = Array.isArray(subjectIds) ? subjectIds : [];
    for (const subjId of validIds) {
      await client.query(
        'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, subjId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: toFaculty(facResult.rows[0], validIds) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── PUT /api/faculty/:id ──────────────────────────────────────────
router.put('/:id', facultyValidators, validate, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, nickname, department, designation, roles = [], email, maxWeeklyHours = 20, subjectIds = [] } = req.body;
    const validRoles = Array.isArray(roles) ? roles : [];

    // Designation validation: HOD (max 1) and Timetable Incharge (max 5)
    if (validRoles.includes('Head of Department (HOD)')) {
      const hodCheck = await client.query(
        `SELECT COUNT(*) FROM faculty WHERE id != $1 AND roles @> '["Head of Department (HOD)"]'::jsonb`,
        [req.params.id]
      );
      if (parseInt(hodCheck.rows[0].count) >= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Only one faculty member can hold the Head of Department (HOD) designation at any given time.',
        });
      }
    }

    if (validRoles.includes('Timetable Incharge')) {
      const inchargeCheck = await client.query(
        `SELECT COUNT(*) FROM faculty WHERE id != $1 AND roles @> '["Timetable Incharge"]'::jsonb`,
        [req.params.id]
      );
      if (parseInt(inchargeCheck.rows[0].count) >= 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: 'Maximum limit of 5 faculty members can hold the Timetable Incharge designation at a time.',
        });
      }
    }

    const facResult = await client.query(
      `UPDATE faculty
       SET name=$2, nickname=$3, department=$4, designation=$5, roles=$6, email=$7, max_weekly_hours=$8, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), nickname?.trim() || null, department.trim(), designation.trim(), JSON.stringify(validRoles), email.trim(), maxWeeklyHours]
    );
    if (facResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Faculty not found.' });
    }

    // Replace all subject associations
    await client.query('DELETE FROM faculty_subjects WHERE faculty_id=$1', [req.params.id]);
    const validIds = Array.isArray(subjectIds) ? subjectIds : [];
    for (const subjId of validIds) {
      await client.query(
        'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [req.params.id, subjId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, data: toFaculty(facResult.rows[0], validIds) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── DELETE /api/faculty/:id ───────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM faculty WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Faculty not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

module.exports = router;
