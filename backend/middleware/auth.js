// middleware/auth.js — JWT auth + role-based access control
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'popeyez-dev-secret-change-in-prod';

// Verifies the Bearer token and attaches { id, role, name } to req.user
export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authentication token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to one or more roles. Usage: requireRole('organizer')
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource' });
    }
    next();
  };
}
