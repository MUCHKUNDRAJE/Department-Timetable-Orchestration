-- ============================================================
-- Department Timetable Orchestration System — Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables (safe re-run)
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS faculty_subjects CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS labs CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- ─────────────────────────── CLASSES ───────────────────────────
CREATE TABLE classes (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name          TEXT NOT NULL,
  department    TEXT NOT NULL,
  semester      INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  section       TEXT NOT NULL,
  student_count INTEGER DEFAULT 60,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────── LABS ──────────────────────────────
CREATE TABLE labs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 30,
  department TEXT NOT NULL,
  location   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────── ROOMS ─────────────────────────────
CREATE TABLE rooms (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 60,
  building   TEXT NOT NULL,
  type       TEXT CHECK (type IN ('lecture', 'seminar', 'auditorium')) DEFAULT 'lecture',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────── SUBJECTS ──────────────────────────
CREATE TABLE subjects (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  type       TEXT CHECK (type IN ('lecture', 'lab')) NOT NULL DEFAULT 'lecture',
  color      TEXT NOT NULL DEFAULT '#5755FE',
  department TEXT NOT NULL,
  semester   INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────── FACULTY ───────────────────────────
CREATE TABLE faculty (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name             TEXT NOT NULL,
  nickname         TEXT,
  department       TEXT NOT NULL,
  designation      TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  max_weekly_hours INTEGER NOT NULL DEFAULT 20,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────── FACULTY_SUBJECTS ────────────────────
CREATE TABLE faculty_subjects (
  faculty_id TEXT REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, subject_id)
);

-- ─────────────────────────── ASSIGNMENTS ───────────────────────
CREATE TABLE assignments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  day         TEXT NOT NULL CHECK (day IN ('Mon','Tue','Wed','Thu','Fri','Sat')),
  start_slot  INTEGER NOT NULL CHECK (start_slot BETWEEN 0 AND 7),
  duration    INTEGER NOT NULL CHECK (duration IN (1, 2)),
  target_type TEXT NOT NULL CHECK (target_type IN ('class', 'lab', 'room')),
  target_id   TEXT NOT NULL,
  class_id    TEXT REFERENCES classes(id) ON DELETE CASCADE,
  faculty_id  TEXT NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id  TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  room_id     TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  lab_id      TEXT REFERENCES labs(id) ON DELETE SET NULL,
  lab_batches JSONB DEFAULT '[]'::JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────── INDEXES ───────────────────────────
CREATE INDEX idx_assignments_day_slot   ON assignments(day, start_slot);
CREATE INDEX idx_assignments_faculty    ON assignments(faculty_id);
CREATE INDEX idx_assignments_target     ON assignments(target_type, target_id);
CREATE INDEX idx_assignments_lab_batches ON assignments USING gin(lab_batches);
