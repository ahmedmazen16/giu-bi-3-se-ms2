// routes/sourcing.js — sourcing requests + delivery tracking (organizer <-> vendor)
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/sourcing — organizers see requests they sent; vendors see ones addressed to them
router.get('/', (req, res) => {
  let sql = `
    SELECT s.*, e.name AS event_name, v.name AS vendor_name, v.company AS vendor_company, o.name AS organizer_name
    FROM sourcing_requests s
    JOIN events e ON e.id = s.event_id
    JOIN users  v ON v.id = s.vendor_id
    JOIN users  o ON o.id = s.organizer_id
    WHERE 1=1
  `;
  const args = [];
  if (req.user.role === 'vendor')         { sql += ' AND s.vendor_id = ?';    args.push(req.user.id); }
  else if (req.user.role === 'organizer') { sql += ' AND s.organizer_id = ?'; args.push(req.user.id); }
  else if (req.user.role === 'staff') {
    // staff see vendor deliveries for the events they work on (to mark arrivals)
    sql += ' AND s.event_id IN (SELECT DISTINCT event_id FROM tasks WHERE assignee_id = ?)'; args.push(req.user.id);
  }
  sql += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(sql).all(...args));
});

// POST /api/sourcing — organizer creates a sourcing request
router.post('/', requireRole('organizer'), (req, res) => {
  const { event_id, vendor_id, items, quantity, delivery_date } = req.body;
  if (!event_id || !vendor_id || !items) {
    return res.status(400).json({ error: 'event_id, vendor_id and items are required' });
  }
  const info = db.prepare(`
    INSERT INTO sourcing_requests (event_id, vendor_id, organizer_id, items, quantity, delivery_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(event_id, vendor_id, req.user.id, items, quantity || null, delivery_date || null);
  res.status(201).json(db.prepare('SELECT * FROM sourcing_requests WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/sourcing/:id — vendor accepts/declines and updates delivery status
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const reqRow = db.prepare('SELECT * FROM sourcing_requests WHERE id = ?').get(id);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });

  const valid = ['accepted', 'declined', 'preparing', 'out_for_delivery', 'delivered'];
  if (req.user.role === 'vendor') {
    if (reqRow.vendor_id !== req.user.id) return res.status(403).json({ error: 'Not your request' });
    if (req.body.status && !valid.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
    const sets = [], args = [];
    if (req.body.status) { sets.push('status = ?'); args.push(req.body.status); }
    if ('note' in req.body) { sets.push('note = ?'); args.push(req.body.note); }
    if (sets.length) { args.push(id); db.prepare(`UPDATE sourcing_requests SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
  } else if (req.user.role === 'staff') {
    // staff can mark a vendor as arrived (delivered) for events they work on
    const onEvent = db.prepare('SELECT 1 ok FROM tasks WHERE assignee_id = ? AND event_id = ?').get(req.user.id, reqRow.event_id);
    if (!onEvent) return res.status(403).json({ error: 'You are not assigned to this event' });
    if (req.body.status !== 'delivered') return res.status(400).json({ error: 'Staff can only mark deliveries as arrived' });
    db.prepare('UPDATE sourcing_requests SET status = ? WHERE id = ?').run('delivered', id);
  } else {
    return res.status(403).json({ error: 'Only the assigned vendor can update this request' });
  }
  res.json(db.prepare('SELECT * FROM sourcing_requests WHERE id = ?').get(id));
});

export default router;
