# 🗓️ Department Timetable Orchestration System

**Frontend:** Next.js 14 (App Router) + Zustand (local state) + TypeScript
**Backend (to build):** Node.js + Express + PostgreSQL
**Institution:** Yeshwantrao Chavan College of Engineering — Dept. of AI & Data Science

---

## 📁 Project Structure (Frontend)

```
src/
├── app/
│   ├── page.tsx              → Home / redirect
│   ├── select/page.tsx       → Entity selector screen
│   ├── schedule/             → Timetable scheduling view
│   ├── print/                → PDF preview & export view
│   └── data/page.tsx         → Data management (CRUD)
├── components/
│   ├── layout/               → Navbar, HydrationGuard
│   ├── print/                → PrintStudio, PrintPreviewSheet
│   └── ui/                   → Button, Select, etc.
├── lib/
│   ├── store.ts              → Zustand global state (currently localStorage)
│   ├── conflict-checker.ts   → Assignment conflict engine (runs client-side)
│   ├── constants.ts          → Days, time slots, institution info
│   ├── seed-data.ts          → Default demo data
│   └── pdf-export.ts         → html-to-image -> jsPDF export
└── types/timetable.ts        → All TypeScript interfaces
```

---

## 🔍 Frontend Scan — What APIs Are Needed

The frontend currently stores everything in localStorage via Zustand.
Every CRUD action in store.ts must become an API call.

### 6 Resource Groups Found

| Resource      | Frontend Type   | Store Actions                        |
|---------------|-----------------|--------------------------------------|
| Classes       | CollegeClass    | add, update, delete, list            |
| Labs          | Lab             | add, update, delete, list            |
| Rooms         | Room            | add, update, delete, list            |
| Faculty       | Faculty         | add, update, delete, list            |
| Subjects      | Subject         | add, update, delete, list            |
| Assignments   | Assignment      | add, update, delete, list, clear-by-target |

### Special Operations Needed

| Operation          | Currently              | Should Become                          |
|--------------------|------------------------|----------------------------------------|
| Conflict Check     | checkAssignmentConflict() — client-side | POST /api/assignments/check-conflict |
| Reset to seed data | Clears localStorage    | POST /api/data/reset                   |
| Full state import  | importFullState()      | POST /api/data/import                  |
| Full state export  | Read from store        | GET /api/data/export                   |

---

## 🤖 AI Prompt — Build the Node.js + Express + PostgreSQL Backend

> Copy this entire prompt into any AI (ChatGPT, Claude, Gemini) to generate a
> complete, production-ready backend.

---

You are an expert Node.js backend developer. Build a complete REST API for a
Department Timetable Orchestration System for an engineering college.

TECH STACK:
- Node.js + Express.js
- PostgreSQL (via pg / node-postgres)
- UUID for IDs (uuid package)
- cors, helmet, morgan, dotenv
- express-validator for input validation

DATABASE SCHEMA — Create all these tables in PostgreSQL:

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE TABLE labs (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 30,
  department TEXT NOT NULL,
  location   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rooms (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name       TEXT NOT NULL,
  capacity   INTEGER NOT NULL DEFAULT 60,
  building   TEXT NOT NULL,
  type       TEXT CHECK (type IN ('lecture', 'seminar', 'auditorium')) DEFAULT 'lecture',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE faculty (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name             TEXT NOT NULL,
  nickname         TEXT, -- e.g. 'SV', 'KK', 'VAP' (uppercase short code)
  department       TEXT NOT NULL,
  designation      TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  max_weekly_hours INTEGER NOT NULL DEFAULT 20,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE faculty_subjects (
  faculty_id TEXT REFERENCES faculty(id) ON DELETE CASCADE,
  subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, subject_id)
);

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
  lab_batches JSONB DEFAULT '[]'::JSONB, -- 4-batch practical division: [{ id: 'A1'|'A2'|'A3'|'A4', facultyId, subjectId, labId }]
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assignments_day_slot ON assignments(day, start_slot);
CREATE INDEX idx_assignments_faculty ON assignments(faculty_id);
CREATE INDEX idx_assignments_target ON assignments(target_type, target_id);
CREATE INDEX idx_assignments_lab_batches ON assignments USING gin(lab_batches);

---

API ENDPOINTS TO BUILD:

Base URL: /api

CLASSES:
  GET    /api/classes          → list all classes
  POST   /api/classes          → create a class
  PUT    /api/classes/:id      → update a class
  DELETE /api/classes/:id      → delete class + cascade its assignments

LABS:
  GET    /api/labs             → list all labs
  POST   /api/labs             → create a lab
  PUT    /api/labs/:id         → update a lab
  DELETE /api/labs/:id         → delete lab + cascade its assignments

ROOMS:
  GET    /api/rooms            → list all rooms
  POST   /api/rooms            → create a room
  PUT    /api/rooms/:id        → update a room
  DELETE /api/rooms/:id        → delete room + cascade its assignments

SUBJECTS:
  GET    /api/subjects         → list all subjects
  POST   /api/subjects         → create a subject
  PUT    /api/subjects/:id     → update a subject
  DELETE /api/subjects/:id     → delete subject + cascade

FACULTY:
  GET    /api/faculty          → list all faculty (include subjectIds array)
  POST   /api/faculty          → create faculty (body includes subjectIds[])
  PUT    /api/faculty/:id      → update faculty (body includes subjectIds[])
  DELETE /api/faculty/:id      → delete faculty + cascade its assignments

  IMPORTANT: faculty GET and POST/PUT must handle the subjectIds array by
  inserting/reading from the faculty_subjects join table.
  Always return subjectIds as an array of subject ID strings.

ASSIGNMENTS:
  GET    /api/assignments                       → list all assignments
  POST   /api/assignments                       → create an assignment (supports labBatches)
  PUT    /api/assignments/:id                   → update an assignment
  DELETE /api/assignments/:id                   → delete a single assignment
  DELETE /api/assignments/target/:type/:id      → delete ALL assignments where
                                                  target_type=:type AND target_id=:id

  ASSIGNMENT OBJECT FORMAT:
  {
    "id": "asg_xxx",
    "day": "Mon",
    "startSlot": 4,
    "duration": 2, // 1 for lecture, 2 for 4-batch lab
    "targetType": "class",
    "targetId": "class_aids_7a",
    "facultyId": "fac_vikram_patel",
    "subjectId": "subj_cs702",
    "labId": "lab_ai_robotics", // strictly lab (no roomId for lab sessions)
    // 4-Batch division for 2-hour practical sessions (strictly labs, no lecture rooms):
    "labBatches": [
      { "id": "A1", "facultyId": "fac_vikram_patel", "subjectId": "subj_cs702", "labId": "lab_ai_robotics" },
      { "id": "A2", "facultyId": "fac_rohan_deshmukh", "subjectId": "subj_cs702", "labId": "lab_data_analytics" },
      { "id": "A3", "facultyId": "fac_kiran_khadare", "subjectId": "subj_cs704", "labId": "lab_cloud_hpc" },
      { "id": "A4", "facultyId": "fac_priya_nair", "subjectId": "subj_cs702", "labId": "lab_ai_robotics" }
    ]
  }

CONFLICT CHECK:
  POST /api/assignments/check-conflict
  Body:
  {
    id?: string,        // optional: assignment being edited (exclude from check)
    day: string,
    startSlot: number,
    duration: 1 | 2,
    targetType: string,
    targetId: string,
    facultyId: string,
    subjectId: string,
    roomId?: string,    // only for lecture duration 1
    labId?: string,     // for lab sessions
    classId?: string,
    labBatches?: Array<{
      id: 'A1' | 'A2' | 'A3' | 'A4',
      facultyId: string,
      subjectId: string,
      labId?: string
    }>
  }
  Response:
  {
    hasConflict: boolean,
    canBook: boolean,
    errors: string[],
    warnings: string[],
    facultyAllocatedHours: number,
    facultyMaxHours: number
  }

  Conflict rules to check:
  1. If duration===2 and startSlot>=7 → error "Lab cannot start at last slot"
  2. Faculty double-booking: same faculty on same day with overlapping slot
  3. Faculty weekly hours: sum(duration) for faculty + new duration > max_weekly_hours → error
  4. Target busy: same target_type + target_id + same day + overlapping slot
  5. Room collision: room_id already used at same day + overlapping slot
  6. Lab collision: lab_id already used at same day + overlapping slot
  7. 4-Batch Practical validation:
     - Each batch (A1, A2, A3, A4) has dedicated faculty and lab validation
     - Duplicate faculty assigned to multiple batches in the same 2-hour slot flagged as collision
     - Duplicate lab facility assigned to multiple batches in the same 2-hour slot flagged as collision
  8. Warning (not error): faculty does not teach this subject

  Slot overlap formula: overlap = max(startA, startB) < min(startA+durA, startB+durB)

DATA UTILITIES:
  GET  /api/data/export  → returns full JSON: { classes, labs, rooms, faculty, subjects, assignments }
  POST /api/data/import  → accepts same JSON, REPLACES all data (truncate + re-insert in a TRANSACTION)
  POST /api/data/reset   → truncates all tables and re-inserts default seed data

---

RESPONSE FORMAT — ALL endpoints must return:

Success:   { "success": true, "data": <payload> }
Error:     { "success": false, "error": "<message>", "details": [...] }

HTTP codes: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 409 Conflict, 500 Internal Server Error

---

PROJECT STRUCTURE to generate:

timetable-api/
├── src/
│   ├── index.js          → Entry point, Express app setup, port listen
│   ├── db.js             → PostgreSQL pool (pg)
│   ├── routes/
│   │   ├── classes.js
│   │   ├── labs.js
│   │   ├── rooms.js
│   │   ├── subjects.js
│   │   ├── faculty.js
│   │   ├── assignments.js
│   │   └── data.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validate.js
│   └── seed/
│       └── seedData.js   → Default data (classes, labs, rooms, faculty, subjects, assignments)
├── migrations/
│   └── 001_init.sql      → All CREATE TABLE + INDEX statements above
├── .env.example
└── package.json

ENVIRONMENT VARIABLES (.env):
  PORT=5000
  DATABASE_URL=postgresql://user:password@localhost:5432/timetable_db
  NODE_ENV=development
  CORS_ORIGIN=http://localhost:3000

PACKAGE.JSON dependencies:
  express, pg, uuid, cors, helmet, morgan, dotenv, express-validator
devDependencies:
  nodemon

ADDITIONAL REQUIREMENTS:
- Use async/await with try/catch everywhere
- Use a single pg Pool instance from db.js
- All route files use express.Router()
- Wrap data/import in a database TRANSACTION
- Include a graceful shutdown handler
- Add input validation using express-validator for all POST/PUT routes
- All queries use parameterized statements ($1, $2 ...) — no string interpolation
- CAMELCASE MAPPING: All API JSON responses must return camelCase keys (e.g. `studentCount`, `maxWeeklyHours`, `subjectIds`, `startSlot`, `targetType`, `targetId`, `classId`, `facultyId`, `subjectId`, `roomId`, `labId`, `labBatches`, `nickname`) to match frontend TypeScript interfaces directly. Map SQL snake_case column names (`student_count`, `max_weekly_hours`, `start_slot`, etc.) to camelCase in queries or helper functions.

Generate the complete, fully working code for every file listed above.
Do not use TODOs or placeholders — write the actual SQL and actual JavaScript for every endpoint.

---

## 🔌 Frontend Integration Guide

Once your backend is running at http://localhost:5000, replace the store's
localStorage logic with fetch calls. Here is the mapping:

Create src/lib/api.ts:

  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  export async function apiFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  }

Store Action → API Endpoint Mapping:

  hydrateFromStorage()              → GET /api/classes + /labs + /rooms + /faculty + /subjects + /assignments
  addClass(item)                    → POST /api/classes
  updateClass(id, updates)          → PUT /api/classes/:id
  deleteClass(id)                   → DELETE /api/classes/:id
  addLab(item)                      → POST /api/labs
  updateLab(id, updates)            → PUT /api/labs/:id
  deleteLab(id)                     → DELETE /api/labs/:id
  addRoom(item)                     → POST /api/rooms
  updateRoom(id, updates)           → PUT /api/rooms/:id
  deleteRoom(id)                    → DELETE /api/rooms/:id
  addFaculty(item)                  → POST /api/faculty
  updateFaculty(id, updates)        → PUT /api/faculty/:id
  deleteFaculty(id)                 → DELETE /api/faculty/:id
  addSubject(item)                  → POST /api/subjects
  updateSubject(id, updates)        → PUT /api/subjects/:id
  deleteSubject(id)                 → DELETE /api/subjects/:id
  addAssignment(data)               → POST /api/assignments
  updateAssignment(id, updates)     → PUT /api/assignments/:id
  deleteAssignment(id)              → DELETE /api/assignments/:id
  clearAssignmentsForTarget(t, id)  → DELETE /api/assignments/target/:type/:id
  resetToSeedData()                 → POST /api/data/reset
  importFullState(state)            → POST /api/data/import
  checkAssignmentConflict(params)   → POST /api/assignments/check-conflict

Add to .env.local (Next.js frontend):
  NEXT_PUBLIC_API_URL=http://localhost:5000

---

## ✅ All Required Endpoints (28 total)

| Method | Path                                | Purpose                            |
|--------|-------------------------------------|------------------------------------|
| GET    | /api/classes                        | List all classes                   |
| POST   | /api/classes                        | Create class                       |
| PUT    | /api/classes/:id                    | Update class                       |
| DELETE | /api/classes/:id                    | Delete class                       |
| GET    | /api/labs                           | List all labs                      |
| POST   | /api/labs                           | Create lab                         |
| PUT    | /api/labs/:id                       | Update lab                         |
| DELETE | /api/labs/:id                       | Delete lab                         |
| GET    | /api/rooms                          | List all rooms                     |
| POST   | /api/rooms                          | Create room                        |
| PUT    | /api/rooms/:id                      | Update room                        |
| DELETE | /api/rooms/:id                      | Delete room                        |
| GET    | /api/subjects                       | List all subjects                  |
| POST   | /api/subjects                       | Create subject                     |
| PUT    | /api/subjects/:id                   | Update subject                     |
| DELETE | /api/subjects/:id                   | Delete subject                     |
| GET    | /api/faculty                        | List all faculty (with subjectIds) |
| POST   | /api/faculty                        | Create faculty                     |
| PUT    | /api/faculty/:id                    | Update faculty                     |
| DELETE | /api/faculty/:id                    | Delete faculty                     |
| GET    | /api/assignments                    | List all assignments               |
| POST   | /api/assignments                    | Create assignment                  |
| PUT    | /api/assignments/:id                | Update assignment                  |
| DELETE | /api/assignments/:id                | Delete single assignment           |
| DELETE | /api/assignments/target/:type/:id   | Clear all assignments for a target |
| POST   | /api/assignments/check-conflict     | Validate before booking            |
| GET    | /api/data/export                    | Export full state as JSON          |
| POST   | /api/data/import                    | Replace full state from JSON       |
| POST   | /api/data/reset                     | Reset to default seed data         |
