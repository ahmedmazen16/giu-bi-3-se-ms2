// routes/guests.js — guest list, invitations, RSVPs, check-in
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/guests?event_id=&rsvp_status=&dietary=&q=
router.get('/', (req, res) => {
  const { event_id, rsvp_status, dietary, q } = req.query;
  let sql = 'SELECT g.*, e.name AS event_name FROM guests g JOIN events e ON e.id = g.event_id WHERE 1=1';
  const args = [];
  if (event_id)    { sql += ' AND g.event_id = ?';   args.push(Number(event_id)); }
  if (rsvp_status) { sql += ' AND g.rsvp_status = ?'; args.push(rsvp_status); }
  if (dietary)     { sql += ' AND g.dietary LIKE ?';  args.push(`%${dietary}%`); }
  if (q)           { sql += ' AND (g.name LIKE ? OR g.email LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY g.name';
  res.json(db.prepare(sql).all(...args));
});

// GET /api/guests/mine — a logged-in guest sees their own invitations (matched by email)
router.get('/mine', (req, res) => {
  const me = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  if (!me) return res.json([]);
  const rows = db.prepare(`
    SELECT g.*, e.name AS event_name, e.start_date, e.theme, v.name AS venue_name, v.location, v.city
    FROM guests g
    JOIN events e ON e.id = g.event_id
    LEFT JOIN venues v ON v.id = e.venue_id
    WHERE g.email = ?
    ORDER BY e.start_date
  `).all(me.email);
  res.json(rows);
});

// POST /api/guests — organizer adds a guest
router.post('/', requireRole('organizer'), (req, res) => {
  const { event_id, name, email, dietary } = req.body;
  if (!event_id || !name || !email) return res.status(400).json({ error: 'event_id, name and email are required' });
  const info = db.prepare('INSERT INTO guests (event_id, name, email, dietary) VALUES (?, ?, ?, ?)')
                 .run(event_id, name, email, dietary || null);
  res.status(201).json(db.prepare('SELECT * FROM guests WHERE id = ?').get(info.lastInsertRowid));
});

// POST /api/guests/:id/invite — organizer sends a digital invitation
router.post('/:id/invite', requireRole('organizer'), (req, res) => {
  db.prepare('UPDATE guests SET invited = 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true, message: 'Invitation sent (simulated email)' });
});

// PATCH /api/guests/:id/rsvp — guest responds to invitation
router.patch('/:id/rsvp', (req, res) => {
  const { rsvp_status, dietary } = req.body;
  if (!['attending', 'not_attending', 'maybe'].includes(rsvp_status)) {
    return res.status(400).json({ error: 'rsvp_status must be attending, not_attending or maybe' });
  }
  db.prepare('UPDATE guests SET rsvp_status = ?, dietary = COALESCE(?, dietary) WHERE id = ?')
    .run(rsvp_status, dietary || null, Number(req.params.id));
  res.json({ ok: true, message: 'RSVP recorded. Thank you!' });
});

// PATCH /api/guests/:id/checkin — staff checks a guest in on the day
router.patch('/:id/checkin', requireRole('organizer', 'staff'), (req, res) => {
  db.prepare('UPDATE guests SET checked_in = 1 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// DELETE /api/guests/:id
router.delete('/:id', requireRole('organizer'), (req, res) => {
  db.prepare('DELETE FROM guests WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
