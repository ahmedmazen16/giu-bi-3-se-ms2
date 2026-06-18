// routes/events.js — event lifecycle management (organizer)
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/events — organizer's events (optionally filter by date)
router.get('/', (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT e.*, v.name AS venue_name FROM events e LEFT JOIN venues v ON v.id = e.venue_id`;
  const args = [];
  if (req.user.role === 'organizer') { sql += ' WHERE e.organizer_id = ?'; args.push(req.user.id); }
  else if (req.user.role === 'staff') {
    // staff see the events they participate in (have at least one task on)
    sql += ' WHERE e.id IN (SELECT DISTINCT event_id FROM tasks WHERE assignee_id = ?)'; args.push(req.user.id);
  }
  else if (req.user.role === 'guest') {
    // guests see the events they are invited to (matched by email)
    sql += ' WHERE e.id IN (SELECT event_id FROM guests WHERE email = (SELECT email FROM users WHERE id = ?))'; args.push(req.user.id);
  }
  else { sql += ' WHERE 1=1'; }
  if (from) { sql += ' AND e.start_date >= ?'; args.push(from); }
  if (to)   { sql += ' AND e.start_date <= ?'; args.push(to); }
  sql += ' ORDER BY e.start_date';
  res.json(db.prepare(sql).all(...args));
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const e = db.prepare(`SELECT e.*, v.name AS venue_name FROM events e LEFT JOIN venues v ON v.id = e.venue_id WHERE e.id = ?`)
              .get(Number(req.params.id));
  if (!e) return res.status(404).json({ error: 'Event not found' });
  res.json(e);
});

// POST /api/events
router.post('/', requireRole('organizer'), (req, res) => {
  const { name, description, theme, venue_id, start_date, end_date, planned_budget } = req.body;
  if (!name) return res.status(400).json({ error: 'Event name is required' });
  const info = db.prepare(`
    INSERT INTO events (organizer_id, name, description, theme, venue_id, start_date, end_date, planned_budget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, description || null, theme || null, venue_id || null,
         start_date || null, end_date || null, planned_budget || 0);
  res.status(201).json(db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/events/:id
router.put('/:id', requireRole('organizer'), (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.organizer_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });

  const fields = ['name', 'description', 'theme', 'venue_id', 'start_date', 'end_date', 'planned_budget', 'status'];
  const sets = [], args = [];
  for (const f of fields) if (f in req.body) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (sets.length) { args.push(id); db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(id));
});

// DELETE /api/events/:id
router.delete('/:id', requireRole('organizer'), (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.organizer_id !== req.user.id) return res.status(403).json({ error: 'Not your event' });
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
