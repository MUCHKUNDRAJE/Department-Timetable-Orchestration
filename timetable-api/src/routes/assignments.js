'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ────────────────────────────────────────
function toAssignment(row) {
  return {
    id:          row.id,
    day:         row.day,
    startSlot:   row.start_slot,
    duration:    row.duration,
    targetType:  row.target_type,
    targetId:    row.target_id,
    classId:     row.class_id,
    facultyId:   row.faculty_id || '',
    subjectId:   row.subject_id || '',
    roomId:      row.room_id,
    labId:       row.lab_id,
    labBatches:  row.lab_batches || [],
    isRecess:    Boolean(row.is_recess),
  };
}

// ─── Overlap Formula ─────────────────────────────────────────────────
// max(startA, startB) < min(startA+durA, startB+durB)
function overlaps(startA, durA, startB, durB) {
  return Math.max(startA, startB) < Math.min(startA + durA, startB + durB);
}

// ─── Validators ─────────────────────────────────────────────────────
const assignmentValidators = [
  body('day').isIn(['Mon','Tue','Wed','Thu','Fri','Sat']).withMessage('day must be Mon|Tue|Wed|Thu|Fri|Sat'),
  body('startSlot').isInt({ min: 0, max: 7 }).withMessage('startSlot must be 0-7'),
  body('duration').isIn([1, 2]).withMessage('duration must be 1 or 2'),
  body('targetType').isIn(['class','lab','room']).withMessage('targetType must be class|lab|room'),
  body('targetId').trim().notEmpty().withMessage('targetId is required'),
  body('facultyId').optional({ nullable: true }).trim(),
  body('subjectId').optional({ nullable: true }).trim(),
  body('isRecess').optional().isBoolean(),
  body('roomId').optional({ nullable: true }).trim(),
  body('labId').optional({ nullable: true }).trim(),
  body('classId').optional({ nullable: true }).trim(),
  body('labBatches').optional().isArray(),
];

// ─── GET /api/assignments ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM assignments ORDER BY day, start_slot', []
    );
    res.json({ success: true, data: result.rows.map(toAssignment) });
  } catch (err) { next(err); }
});

// ─── POST /api/assignments ───────────────────────────────────────────
router.post('/', assignmentValidators, validate, async (req, res, next) => {
  try {
    const {
      day, startSlot, duration, targetType, targetId,
      classId, facultyId, subjectId, roomId, labId, labBatches = [], isRecess = false,
    } = req.body;
    const id = req.body.id || `asg_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const result = await db.query(
      `INSERT INTO assignments
         (id, day, start_slot, duration, target_type, target_id, class_id,
          faculty_id, subject_id, room_id, lab_id, lab_batches, is_recess)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        id, day, startSlot, duration, targetType, targetId,
        classId || null,
        isRecess ? null : (facultyId || null),
        isRecess ? null : (subjectId || null),
        isRecess ? null : (roomId || null),
        isRecess ? null : (labId || null),
        JSON.stringify(labBatches),
        Boolean(isRecess),
      ]
    );
    res.status(201).json({ success: true, data: toAssignment(result.rows[0]) });
  } catch (err) { next(err); }
});

// ─── PUT /api/assignments/:id ────────────────────────────────────────
router.put('/:id', assignmentValidators, validate, async (req, res, next) => {
  try {
    const {
      day, startSlot, duration, targetType, targetId,
      classId, facultyId, subjectId, roomId, labId, labBatches = [], isRecess = false,
    } = req.body;
    const result = await db.query(
      `UPDATE assignments
       SET day=$2, start_slot=$3, duration=$4, target_type=$5, target_id=$6,
           class_id=$7, faculty_id=$8, subject_id=$9, room_id=$10, lab_id=$11,
           lab_batches=$12, is_recess=$13, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        req.params.id, day, startSlot, duration, targetType, targetId,
        classId || null,
        isRecess ? null : (facultyId || null),
        isRecess ? null : (subjectId || null),
        isRecess ? null : (roomId || null),
        isRecess ? null : (labId || null),
        JSON.stringify(labBatches),
        Boolean(isRecess),
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Assignment not found.' });
    res.json({ success: true, data: toAssignment(result.rows[0]) });
  } catch (err) { next(err); }
});

// ─── DELETE /api/assignments/:id ─────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM assignments WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Assignment not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

// ─── DELETE /api/assignments/target/:type/:id ────────────────────────
// Must be registered BEFORE /:id so Express matches it first
router.delete('/target/:type/:targetId', async (req, res, next) => {
  try {
    const { type, targetId } = req.params;
    const result = await db.query(
      'DELETE FROM assignments WHERE target_type=$1 AND target_id=$2 RETURNING id',
      [type, targetId]
    );
    res.json({ success: true, data: { deleted: result.rowCount } });
  } catch (err) { next(err); }
});

// ─── POST /api/assignments/check-conflict ────────────────────────────
router.post('/check-conflict', async (req, res, next) => {
  try {
    const {
      id: excludeId,
      day,
      startSlot,
      duration,
      targetType,
      targetId,
      facultyId,
      subjectId,
      roomId,
      labId,
      classId,
      labBatches = [],
    } = req.body;

    const errors   = [];
    const warnings = [];

    // 1. Boundary check
    if (duration === 2 && startSlot >= 7) {
      errors.push('A 2-hour Lab cannot be scheduled in the last slot (4:00 PM – 5:00 PM) as it extends beyond institutional working hours.');
    }

    // Fetch faculty info
    const facResult = await db.query('SELECT * FROM faculty WHERE id=$1', [facultyId]);
    const faculty   = facResult.rows[0] || null;
    const maxWeeklyHours = faculty ? faculty.max_weekly_hours : 20;

    // Fetch subject info
    const subjResult = await db.query('SELECT * FROM subjects WHERE id=$1', [subjectId]);
    const subject    = subjResult.rows[0] || null;

    // 2. Faculty teaching capability warning
    if (faculty && subject) {
      const fsResult = await db.query(
        'SELECT 1 FROM faculty_subjects WHERE faculty_id=$1 AND subject_id=$2',
        [facultyId, subjectId]
      );
      if (fsResult.rowCount === 0) {
        warnings.push(`${faculty.name} is not officially mapped to teach ${subject.code} (${subject.name}).`);
      }
    }

    // 3. Faculty weekly hours check
    const hoursResult = await db.query(
      `SELECT COALESCE(SUM(duration), 0) AS total
       FROM assignments WHERE faculty_id=$1 ${excludeId ? 'AND id != $2' : ''}`,
      excludeId ? [facultyId, excludeId] : [facultyId]
    );
    const currentHours  = parseInt(hoursResult.rows[0].total, 10);
    const projectedHours = currentHours + duration;

    if (faculty && projectedHours > maxWeeklyHours) {
      errors.push(
        `Weekly Hours Limit Exceeded: ${faculty.name} has currently allocated ${currentHours}/${maxWeeklyHours} hrs. Adding this ${duration}-hour slot would result in ${projectedHours} hrs (exceeding maximum allowance by ${projectedHours - maxWeeklyHours} hr).`
      );
    }

    // Fetch all other assignments on the same day
    const otherResult = await db.query(
      `SELECT a.*, f.name AS faculty_name, s.code AS subject_code, s.name AS subject_name
       FROM assignments a
       LEFT JOIN faculty f ON a.faculty_id = f.id
       LEFT JOIN subjects s ON a.subject_id = s.id
       WHERE a.day=$1 ${excludeId ? 'AND a.id != $2' : ''}`,
      excludeId ? [day, excludeId] : [day]
    );

    for (const existing of otherResult.rows) {
      const doesOverlap = overlaps(startSlot, duration, existing.start_slot, existing.duration);
      if (!doesOverlap) continue;

      // 4. Faculty double-booking
      if (existing.faculty_id === facultyId) {
        errors.push(
          `Faculty Double-Booking: ${faculty?.name || 'Selected Faculty'} is already scheduled for ${existing.subject_code || 'a session'} at ${day} (slot ${existing.start_slot}).`
        );
      }

      // 5. Target entity conflict
      if (existing.target_type === targetType && existing.target_id === targetId) {
        errors.push(
          `Target Busy: This ${targetType} already has an active session (${existing.subject_code} with ${existing.faculty_name || 'Faculty'}) during this time on ${day}.`
        );
      }

      // 6. Room collision
      if (roomId && (existing.room_id === roomId || (existing.target_type === 'room' && existing.target_id === roomId))) {
        const roomRes = await db.query('SELECT name FROM rooms WHERE id=$1', [roomId]);
        const roomName = roomRes.rows[0]?.name || roomId;
        errors.push(
          `Room Collision: ${roomName} is already occupied at this time on ${day}.`
        );
      }

      // 7. Lab collision
      if (labId && (existing.lab_id === labId || (existing.target_type === 'lab' && existing.target_id === labId))) {
        const labRes = await db.query('SELECT name FROM labs WHERE id=$1', [labId]);
        const labName = labRes.rows[0]?.name || labId;
        errors.push(
          `Lab Collision: ${labName} is already reserved at this time on ${day}.`
        );
      }
    }

    // 8. 4-Batch Practical validation
    if (labBatches && labBatches.length > 0) {
      const batchFacultyIds = labBatches.map((b) => b.facultyId).filter(Boolean);
      const batchLabIds     = labBatches.map((b) => b.labId).filter(Boolean);

      // Duplicate faculty across batches
      const dupFaculty = batchFacultyIds.filter((id, i) => batchFacultyIds.indexOf(id) !== i);
      if (dupFaculty.length > 0) {
        const dupFacResult = await db.query(
          `SELECT name FROM faculty WHERE id = ANY($1::text[])`, [dupFaculty]
        );
        for (const f of dupFacResult.rows) {
          errors.push(`Batch Conflict: Faculty ${f.name} is assigned to multiple batches in the same 2-hour slot.`);
        }
      }

      // Duplicate labs across batches
      const dupLabs = batchLabIds.filter((id, i) => batchLabIds.indexOf(id) !== i);
      if (dupLabs.length > 0) {
        const dupLabResult = await db.query(
          `SELECT name FROM labs WHERE id = ANY($1::text[])`, [dupLabs]
        );
        for (const l of dupLabResult.rows) {
          errors.push(`Batch Conflict: Lab ${l.name} is assigned to multiple batches in the same 2-hour slot.`);
        }
      }

      // Check each batch faculty against existing assignments
      for (const batch of labBatches) {
        if (!batch.facultyId) continue;
        for (const existing of otherResult.rows) {
          if (!overlaps(startSlot, duration, existing.start_slot, existing.duration)) continue;
          if (existing.faculty_id === batch.facultyId && existing.faculty_id !== facultyId) {
            errors.push(
              `Batch ${batch.id} Faculty Conflict: Faculty is double-booked at ${day} slot ${startSlot}.`
            );
          }
        }

        // Check each batch lab against existing assignments
        if (batch.labId) {
          for (const existing of otherResult.rows) {
            if (!overlaps(startSlot, duration, existing.start_slot, existing.duration)) continue;
            if (
              (existing.lab_id === batch.labId || (existing.target_type === 'lab' && existing.target_id === batch.labId)) &&
              batch.labId !== labId
            ) {
              const labRes  = await db.query('SELECT name FROM labs WHERE id=$1', [batch.labId]);
              const labName = labRes.rows[0]?.name || batch.labId;
              errors.push(`Batch ${batch.id} Lab Conflict: ${labName} is already reserved at this time.`);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        hasConflict:           errors.length > 0,
        canBook:               errors.length === 0,
        errors,
        warnings,
        facultyAllocatedHours: currentHours,
        facultyMaxHours:       maxWeeklyHours,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
