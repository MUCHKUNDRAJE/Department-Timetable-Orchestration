'use strict';

const db = require('../db');
const {
  SEED_CLASSES, SEED_LABS, SEED_ROOMS,
  SEED_SUBJECTS, SEED_FACULTY, SEED_ASSIGNMENTS,
} = require('./seedData');

async function seed() {
  const client = await db.getClient();
  try {
    console.log('[Seed] Connecting to database...');
    await client.query('BEGIN');
    await client.query('TRUNCATE assignments, faculty_subjects, faculty, subjects, rooms, labs, classes CASCADE');

    console.log('[Seed] Inserting classes...');
    for (const c of SEED_CLASSES) {
      await client.query(
        `INSERT INTO classes (id, name, department, semester, section, student_count) VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.id, c.name, c.department, c.semester, c.section, c.studentCount]
      );
    }

    console.log('[Seed] Inserting labs...');
    for (const l of SEED_LABS) {
      await client.query(
        `INSERT INTO labs (id, name, capacity, department, location) VALUES ($1,$2,$3,$4,$5)`,
        [l.id, l.name, l.capacity, l.department, l.location ?? null]
      );
    }

    console.log('[Seed] Inserting rooms...');
    for (const r of SEED_ROOMS) {
      await client.query(
        `INSERT INTO rooms (id, name, capacity, building, type) VALUES ($1,$2,$3,$4,$5)`,
        [r.id, r.name, r.capacity, r.building, r.type]
      );
    }

    console.log('[Seed] Inserting subjects...');
    for (const s of SEED_SUBJECTS) {
      await client.query(
        `INSERT INTO subjects (id, name, code, type, color, department, semester) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [s.id, s.name, s.code, s.type, s.color, s.department, s.semester]
      );
    }

    console.log('[Seed] Inserting faculty & mappings...');
    for (const f of SEED_FACULTY) {
      await client.query(
        `INSERT INTO faculty (id, name, nickname, department, designation, email, max_weekly_hours) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [f.id, f.name, f.nickname ?? null, f.department, f.designation, f.email, f.maxWeeklyHours]
      );
      for (const subjId of f.subjectIds) {
        await client.query(
          'INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES ($1,$2)',
          [f.id, subjId]
        );
      }
    }

    console.log('[Seed] Inserting assignments...');
    for (const a of SEED_ASSIGNMENTS) {
      await client.query(
        `INSERT INTO assignments
           (id, day, start_slot, duration, target_type, target_id, class_id,
            faculty_id, subject_id, room_id, lab_id, lab_batches)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          a.id, a.day, a.startSlot, a.duration, a.targetType, a.targetId,
          a.classId ?? null, a.facultyId, a.subjectId,
          a.roomId ?? null, a.labId ?? null,
          JSON.stringify(a.labBatches ?? []),
        ]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully! All initial sample data populated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed();
