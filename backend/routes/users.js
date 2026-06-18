// routes/users.js — manage stakeholder accounts (staff, vendors, guests, venue owners)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

const strip = (u) => { if (!u) return u; const { password, ...r } = u; return r; };

// GET /api/users?role=staff&speciality=Catering&employment=full-time
router.get('/', (req, res) => {
  const { role, speciality, employment, q } = req.query;
  let sql = 'SELECT * FROM users WHERE 1=1';
  const args = [];
  if (role)       { sql += ' AND role = ?';        args.push(role); }
  if (speciality) { sql += ' AND speciality = ?';  args.push(speciality); }
  if (employment) { sql += ' AND employment = ?';  args.push(employment); }
  if (q)          { sql += ' AND (name LIKE ? OR email LIKE ?)'; args.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...args).map(strip));
});

// POST /api/users — organizer creates accounts for staff / guests / vendors
router.post('/', requireRole('organizer'), (req, res) => {
  const { name, email, password, role, age, speciality, employment, company, supplies, location, pricing, phone } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required' });
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already in use' });

  const hash = bcrypt.hashSync(password || 'changeme123', 10);
  const info = db.prepare(`
    INSERT INTO users (name, email, password, role, age, speciality, employment, company, supplies, location, pricing, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, hash, role, age || null, speciality || null, employment || null,
         company || null, supplies || null, location || null, pricing || null, phone || null);
  res.status(201).json(strip(db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)));
});

// PATCH /api/users/:id — update own profile or (organizer) any profile
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (req.user.role !== 'organizer' && req.user.id !== id) {
    return res.status(403).json({ error: 'You can only edit your own profile' });
  }
  const fields = ['name', 'company', 'supplies', 'location', 'pricing', 'phone', 'speciality', 'employment', 'age'];
  const sets = [], args = [];
  for (const f of fields) if (f in req.body) { sets.push(`${f} = ?`); args.push(req.body[f]); }
  if (!sets.length) return res.status(400).json({ error: 'No editable fields supplied' });
  args.push(id);
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...args);
  res.json(strip(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
});

// PATCH /api/users/:id/deactivate — organizer deactivates a stakeholder account
router.patch('/:id/deactivate', requireRole('organizer'), (req, res) => {
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

export default router;
