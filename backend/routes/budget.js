// routes/budget.js — budget planning + actual expense tracking per event
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/budget/:eventId — line items + totals + variance
router.get('/:eventId', (req, res) => {
  const eventId = Number(req.params.eventId);
  const items = db.prepare('SELECT * FROM budget_items WHERE event_id = ? ORDER BY category').all(eventId);
  const totals = items.reduce((acc, i) => {
    acc.planned += i.planned; acc.actual += i.actual; return acc;
  }, { planned: 0, actual: 0 });
  totals.variance = totals.planned - totals.actual;
  res.json({ items, totals });
});

// POST /api/budget — organizer adds a budget category line
router.post('/', requireRole('organizer'), (req, res) => {
  const { event_id, category, planned, actual } = req.body;
  if (!event_id || !category) return res.status(400).json({ error: 'event_id and category are required' });
  const info = db.prepare('INSERT INTO budget_items (event_id, category, planned, actual) VALUES (?, ?, ?, ?)')
                 .run(event_id, category, planned || 0, actual || 0);
  res.status(201).json(db.prepare('SELECT * FROM budget_items WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/budget/:id — edit planned or log actual expense
router.patch('/:id', requireRole('organizer'), (req, res) => {
  const id = Number(req.params.id);
  const sets = [], args = [];
  for (const f of ['category', 'planned', 'actual']) if (f in req.body) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  args.push(id);
  db.prepare(`UPDATE budget_items SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json(db.prepare('SELECT * FROM budget_items WHERE id = ?').get(id));
});

// DELETE /api/budget/:id
router.delete('/:id', requireRole('organizer'), (req, res) => {
  db.prepare('DELETE FROM budget_items WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
