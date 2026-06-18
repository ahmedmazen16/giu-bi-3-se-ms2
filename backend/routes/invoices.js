// routes/invoices.js — vendor invoices + organizer review
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/invoices — organizers see invoices billed to them; vendors see their own
router.get('/', (req, res) => {
  let sql = `
    SELECT i.*, v.name AS vendor_name, v.company AS vendor_company, o.name AS organizer_name
    FROM invoices i
    JOIN users v ON v.id = i.vendor_id
    JOIN users o ON o.id = i.organizer_id
    WHERE 1=1
  `;
  const args = [];
  if (req.user.role === 'vendor')         { sql += ' AND i.vendor_id = ?';    args.push(req.user.id); }
  else if (req.user.role === 'organizer') { sql += ' AND i.organizer_id = ?'; args.push(req.user.id); }
  sql += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(sql).all(...args));
});

// POST /api/invoices — vendor submits an invoice
router.post('/', requireRole('vendor'), (req, res) => {
  const { request_id, organizer_id, amount, details } = req.body;
  if (!organizer_id || amount == null) return res.status(400).json({ error: 'organizer_id and amount are required' });
  const info = db.prepare(`
    INSERT INTO invoices (request_id, vendor_id, organizer_id, amount, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(request_id || null, req.user.id, organizer_id, amount, details || null);
  res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/invoices/:id — organizer reviews / approves / marks paid
router.patch('/:id', requireRole('organizer'), (req, res) => {
  const id = Number(req.params.id);
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  if (inv.organizer_id !== req.user.id) return res.status(403).json({ error: 'Not your invoice' });
  if (!['pending_review', 'approved', 'paid'].includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare('UPDATE invoices SET status = ? WHERE id = ?').run(req.body.status, id);
  res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(id));
});

export default router;
