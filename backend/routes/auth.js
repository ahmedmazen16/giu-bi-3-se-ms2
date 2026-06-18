// routes/auth.js — registration, login, current user
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { auth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

function publicUser(u) {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
}

// POST /api/auth/register  — open registration (vendors, guests, venue owners)
router.post('/register', (req, res) => {
  const { name, email, password, role, company, supplies, location, pricing, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required' });
  }
  const allowed = ['vendor', 'guest', 'venue_owner', 'organizer'];
  if (!allowed.includes(role)) {
    return res.status(400).json({ error: 'Invalid role for self-registration' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (name, email, password, role, company, supplies, location, pricing, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, email, hash, role, company || null, supplies || null, location || null, pricing || null, phone || null);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (!user.active) return res.status(403).json({ error: 'This account has been deactivated' });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: publicUser(user) });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

export default router;
