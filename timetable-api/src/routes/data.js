'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const {
  SEED_CLASSES, SEED_LABS, SEED_ROOMS,
  SEED_SUBJECTS, SEED_FACULTY, SEED_ASSIGNMENTS,
} = require('../seed/seedData');

const router = express.Router();

// ─── Helper: row mappers ─────────────────────────────────────────────
function toClass(r)      { return { id: r.id, name: r.name, department: r.department, semester: r.semester, section: r.section, studentCount: r.student_count, classTeacherId: r.class_teacher_id || undefined }; }
function toLab(r)        { return { id: r.id, name: r.name, capacity: r.capacity, department: r.department, location: r.location }; }
function toRoom(r)       { return { id: r.id, name: r.name, capacity: r.capacity, building: r.building, type: r.type }; }
function toSubject(r)    { return { id: r.id, name: r.name, code: r.code, abbreviation: r.abbreviation || undefined, type: r.type, color: r.color, department: r.department, semester: r.semester }; }
function toFaculty(r, subjectIds = []) {
  let roles = [];
  if (Array.isArray(r.roles)) roles = r.roles;
  else if (typeof r.roles === 'string') {
    try { roles = JSON.parse(r.roles); } catch (_) { roles = []; }
  }
  return { id: r.id, name: r.name, nickname: r.nickname, department: r.department, designation: r.designation, roles, email: r.email, maxWeeklyHours: r.max_weekly_hours, subjectIds };
}
function toAssignment(r) { return { id: r.id, day: r.day, startSlot: r.start_slot, duration: r.duration, targetType: r.target_type, targetId: r.target_id, classId: r.class_id, facultyId: r.faculty_id || '', subjectId: r.subject_id || '', roomId: r.room_id, labId: r.lab_id, labBatches: r.lab_batches || [], isRecess: Boolean(r.is_recess) }; }

// ─── GET /api/data/export ────────────────────────────────────────────
router.get('/export', async (req, res, next) => {
  try {
    const [classes, labs, rooms, subjects, facultyRows, fsRows, assignments] = await Promise.all([
      db.query('SELECT * FROM classes ORDER BY semester, section, name'),
      db.query('SELECT * FROM labs ORDER BY name'),
      db.query('SELECT * FROM rooms ORDER BY name'),
      db.query('SELECT * FROM subjects ORDER BY semester, code'),
      db.query('SELECT * FROM faculty ORDER BY name'),
      db.query('SELECT faculty_id, subject_id FROM faculty_subjects'),
      db.query('SELECT * FROM assignments ORDER BY day, start_slot'),
    ]);

    const subjectMap = {};
    for (const row of fsRows.rows) {
      if (!subjectMap[row.faculty_id]) subjectMap[row.faculty_id] = [];
      subjectMap[row.faculty_id].push(row.subject_id);
    }

    res.json({
      success: true,
      data: {
        classes:     classes.rows.map(toClass),
        labs:        labs.rows.map(toLab),
        rooms:       rooms.rows.map(toRoom),
        subjects:    subjects.rows.map(toSubject),
        faculty:     facultyRows.rows.map((r) => toFaculty(r, subjectMap[r.id] || [])),
        assignments: assignments.rows.map(toAssignment),
      },
    });
  } catch (err) { next(err); }
});

// ─── POST /api/data/import ───────────────────────────────────────────
// Replaces ALL data inside a single transaction.
router.post('/import', async (req, res, next) => {
  const { classes = [], labs = [], rooms = [], subjects = [], faculty = [], assignments = [] } = req.body;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Truncate in dependency order
    await client.query('TRUNCATE assignments, faculty_subjects, faculty, subjects, rooms, labs, classes CASCADE');

    // Insert faculty first (so classes can reference faculty.id via class_teacher_id)
    for (const f of faculty) {
      const validRoles = Array.isArray(f.roles) ? f.roles : [];
      await client.query(
        `INSERT INTO faculty (id, name, nickname, department, designation, roles, email, max_weekly_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [f.id, f.name, f.nickname ?? null, f.department, f.designation, JSON.stringify(validRoles), f.email, f.maxWeeklyHours ?? 20]
      );
      for (const subjId of (f.subjectIds || [])) {
        await client.query(
          'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [f.id, subjId]
        );
      }
    }

    // Insert classes
    for (const c of classes) {
      await client.query(
        `INSERT INTO classes (id, name, department, semester, section, student_count, class_teacher_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.name, c.department, c.semester, c.section, c.studentCount ?? 60, c.classTeacherId || null]
      );
    }
    // Insert labs
    for (const l of labs) {
      await client.query(
        `INSERT INTO labs (id, name, capacity, department, location)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [l.id, l.name, l.capacity, l.department, l.location ?? null]
      );
    }
    // Insert rooms
    for (const r of rooms) {
      await client.query(
        `INSERT INTO rooms (id, name, capacity, building, type)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.capacity, r.building, r.type ?? 'lecture']
      );
    }
    // Insert subjects
    for (const s of subjects) {
      await client.query(
        `INSERT INTO subjects (id, name, code, abbreviation, type, color, department, semester)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.name, s.code, s.abbreviation ?? null, s.type, s.color, s.department, s.semester]
      );
    }
    // Insert assignments
    for (const a of assignments) {
      await client.query(
        `INSERT INTO assignments
           (id, day, start_slot, duration, target_type, target_id, class_id,
            faculty_id, subject_id, room_id, lab_id, lab_batches, is_recess)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [
          a.id, a.day, a.startSlot, a.duration, a.targetType, a.targetId,
          a.classId ?? null,
          a.isRecess ? null : (a.facultyId || null),
          a.isRecess ? null : (a.subjectId || null),
          a.roomId ?? null, a.labId ?? null,
          JSON.stringify(a.labBatches ?? []),
          Boolean(a.isRecess),
        ]
      );
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      data: {
        imported: {
          classes: classes.length, labs: labs.length, rooms: rooms.length,
          subjects: subjects.length, faculty: faculty.length, assignments: assignments.length,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ─── POST /api/data/reset ────────────────────────────────────────────
// Truncates all tables and re-inserts seed data after password authentication.
router.post('/reset', async (req, res, next) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'User password is required to reset data.' });
  }

  // Verify password with current logged-in user
  try {
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User account not found.' });
    }
    const isMatch = await bcrypt.compare(password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(403).json({ success: false, error: 'Incorrect password. Data reset cancelled.' });
    }
  } catch (authErr) {
    return next(authErr);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE assignments, faculty_subjects, faculty, subjects, rooms, labs, classes CASCADE');
    await client.query('COMMIT');
    res.json({ success: true, data: { message: 'All database records cleared completely.' } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
