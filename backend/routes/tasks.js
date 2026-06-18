// Tasks module - Ahmed Mazen 22001360
// routes/tasks.js — task management (organizer assigns, staff updates progress)
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// GET /api/tasks?event_id=&status=&assignee_id=
// Staff automatically see only tasks assigned to them.
router.get('/', (req, res) => {
  const { event_id, status, assignee_id } = req.query;
  let sql = `
    SELECT t.*, e.name AS event_name, u.name AS assignee_name
    FROM tasks t
    JOIN events e ON e.id = t.event_id
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE 1=1
  `;
  const args = [];
  if (req.user.role === 'staff') { sql += ' AND t.assignee_id = ?'; args.push(req.user.id); }
  if (event_id)    { sql += ' AND t.event_id = ?';    args.push(Number(event_id)); }
  if (status)      { sql += ' AND t.status = ?';      args.push(status); }
  if (assignee_id) { sql += ' AND t.assignee_id = ?'; args.push(Number(assignee_id)); }
  sql += ' ORDER BY t.due_date';
  res.json(db.prepare(sql).all(...args));
});

// POST /api/tasks — organizer creates / assigns a task
router.post('/', requireRole('organizer'), (req, res) => {
  const { event_id, title, description, assignee_id, due_date } = req.body;
  if (!event_id || !title) return res.status(400).json({ error: 'event_id and title are required' });
  const info = db.prepare(`
    INSERT INTO tasks (event_id, title, description, assignee_id, due_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(event_id, title, description || null, assignee_id || null, due_date || null);
  res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid));
});

// PATCH /api/tasks/:id — organizer reassigns; staff updates status of own task
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (req.user.role === 'staff') {
    if (task.assignee_id !== req.user.id) return res.status(403).json({ error: 'Not your task' });
    if (!['pending', 'in_progress', 'done'].includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(req.body.status, id);
  } else if (req.user.role === 'organizer') {
    const fields = ['title', 'description', 'assignee_id', 'due_date', 'status'];
    const sets = [], args = [];
    for (const f of fields) if (f in req.body) { sets.push(`${f} = ?`); args.push(req.body[f]); }
    if (sets.length) { args.push(id); db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...args); }
  } else {
    return res.status(403).json({ error: 'Not allowed' });
  }
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

// DELETE /api/tasks/:id
router.delete('/:id', requireRole('organizer'), (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
