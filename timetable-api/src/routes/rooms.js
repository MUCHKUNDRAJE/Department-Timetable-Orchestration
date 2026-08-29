'use strict';

const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const validate = require('../middleware/validate');

const router = express.Router();

// ─── Helper: row → camelCase ───────────────────────────────────────
function toRoom(row) {
  return {
    id:       row.id,
    name:     row.name,
    capacity: row.capacity,
    building: row.building,
    type:     row.type,
  };
}

// ─── Validators ────────────────────────────────────────────────────
const roomValidators = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('capacity').isInt({ min: 1 }).withMessage('capacity must be a positive integer'),
  body('building').trim().notEmpty().withMessage('building is required'),
  body('type').optional().isIn(['lecture', 'seminar', 'auditorium']).withMessage('type must be lecture|seminar|auditorium'),
];

// GET /api/rooms
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM rooms ORDER BY name', []);
    res.json({ success: true, data: result.rows.map(toRoom) });
  } catch (err) { next(err); }
});

// POST /api/rooms
router.post('/', roomValidators, validate, async (req, res, next) => {
  try {
    const { name, capacity, building, type = 'lecture' } = req.body;
    const id = req.body.id || `room_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const result = await db.query(
      `INSERT INTO rooms (id, name, capacity, building, type)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, name.trim(), capacity, building.trim(), type]
    );
    res.status(201).json({ success: true, data: toRoom(result.rows[0]) });
  } catch (err) { next(err); }
});

// PUT /api/rooms/:id
router.put('/:id', roomValidators, validate, async (req, res, next) => {
  try {
    const { name, capacity, building, type = 'lecture' } = req.body;
    const result = await db.query(
      `UPDATE rooms
       SET name=$2, capacity=$3, building=$4, type=$5, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id, name.trim(), capacity, building.trim(), type]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Room not found.' });
    res.json({ success: true, data: toRoom(result.rows[0]) });
  } catch (err) { next(err); }
});

// DELETE /api/rooms/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM rooms WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Room not found.' });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { next(err); }
});

module.exports = router;
