// routes/bookings.js — venue booking applications (organizer <-> venue owner)
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/bookings — organizers see their own; venue owners see requests for their venues
router.get('/', (req, res) => {
  let sql = `
    SELECT b.*, v.name AS venue_name, v.city, u.name AS organizer_name
    FROM bookings b
    JOIN venues v ON v.id = b.venue_id
    JOIN users  u ON u.id = b.organizer_id
  `;
  const args = [];
  if (req.user.role === 'organizer')        { sql += ' WHERE b.organizer_id = ?'; args.push(req.user.id); }
  else if (req.user.role === 'venue_owner') { sql += ' WHERE v.owner_id = ?';     args.push(req.user.id); }
  sql += ' ORDER BY b.created_at DESC';
  res.json(db.prepare(sql).all(...args));
});

// POST /api/bookings — organizer applies to book a venue
router.post('/', requireRole('organizer'), (req, res) => {
  const { venue_id, event_date, attendees, notes } = req.body;
  if (!venue_id || !event_date) return res.status(400).json({ error: 'venue_id and event_date are required' });
  const venue = db.prepare('SELECT id FROM venues WHERE id = ?').get(venue_id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });

  const info = db.prepare(`
    INSERT INTO bookings (venue_id, organizer_id, event_date, attendees, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(venue_id, req.user.id, event_date, attendees || null, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/bookings/:id — venue owner approves / declines with optional message
router.patch('/:id', requireRole('venue_owner'), (req, res) => {
  const { status, owner_message } = req.body;
  if (!['approved', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'status must be approved or declined' });
  }
  const id = Number(req.params.id);
  const booking = db.prepare(`
    SELECT b.*, v.owner_id FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE b.id = ?
  `).get(id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your venue' });

  db.prepare('UPDATE bookings SET status = ?, owner_message = ? WHERE id = ?')
    .run(status, owner_message || null, id);
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
});

export default router;
