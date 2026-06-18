venues module - Malak El Koumy 22001380
// routes/venues.js — venue listings (venue owners) + search/browse (organizers)
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/venues?city=Cairo&minCapacity=50&date=2026-07-01
// Browsing/filtering for organizers. Owners see only their own via ?mine=1
router.get('/', (req, res) => {
  const { city, minCapacity, q, mine } = req.query;
  let sql = 'SELECT v.*, u.name AS owner_name FROM venues v JOIN users u ON u.id = v.owner_id WHERE v.active = 1';
  const args = [];
  if (mine && req.user.role === 'venue_owner') { sql += ' AND v.owner_id = ?'; args.push(req.user.id); }
  if (city)        { sql += ' AND v.city LIKE ?';      args.push(`%${city}%`); }
  if (minCapacity) { sql += ' AND v.capacity >= ?';    args.push(Number(minCapacity)); }
  if (q)           { sql += ' AND (v.name LIKE ? OR v.description LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY v.created_at DESC';
  res.json(db.prepare(sql).all(...args));
});

// GET /api/venues/:id
router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT v.*, u.name AS owner_name FROM venues v JOIN users u ON u.id = v.owner_id WHERE v.id = ?')
              .get(Number(req.params.id));
  if (!v) return res.status(404).json({ error: 'Venue not found' });
  res.json(v);
});

// POST /api/venues — venue owner creates a listing
router.post('/', requireRole('venue_owner'), (req, res) => {
  const { name, description, location, city, capacity, size_sqm, amenities, price_per_day, photo } = req.body;
  if (!name || !location || !city || !capacity || price_per_day == null) {
    return res.status(400).json({ error: 'name, location, city, capacity and price_per_day are required' });
  }
  const info = db.prepare(`
    INSERT INTO venues (owner_id, name, description, location, city, capacity, size_sqm, amenities, price_per_day, photo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, description || null, location, city, capacity, size_sqm || null,
         amenities || null, price_per_day, photo || null);
  res.status(201).json(db.prepare('SELECT * FROM venues WHERE id = ?').get(info.lastInsertRowid));
});

// PUT /api/venues/:id — owner edits their listing
router.put('/:id', requireRole('venue_owner'), (req, res) => {
  const id = Number(req.params.id);
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  if (venue.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your venue' });

  const fields = ['name', 'description', 'location', 'city', 'capacity', 'size_sqm', 'amenities', 'price_per_day', 'photo', 'active'];
  const sets = [], args = [];
  for (const f of fields) if (f in req.body) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (sets.length) { args.push(id); db.prepare(`UPDATE venues SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
  res.json(db.prepare('SELECT * FROM venues WHERE id = ?').get(id));
});

// DELETE /api/venues/:id — owner removes a listing
router.delete('/:id', requireRole('venue_owner'), (req, res) => {
  const id = Number(req.params.id);
  const venue = db.prepare('SELECT * FROM venues WHERE id = ?').get(id);
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  if (venue.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your venue' });
  db.prepare('DELETE FROM venues WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
