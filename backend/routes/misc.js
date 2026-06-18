// routes/misc.js — day-of communications, feedback, reports, and dashboard stats
import { Router } from 'express';
import db from '../db.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(auth);

// ----- Day-Of Communications -----------------------------------------------

// POST /api/comms — organizer broadcasts a day-of message to all event guests
router.post('/comms', requireRole('organizer'), (req, res) => {
  const { event_id, message } = req.body;
  if (!event_id || !message) return res.status(400).json({ error: 'event_id and message are required' });
  const info = db.prepare('INSERT INTO communications (event_id, message) VALUES (?, ?)').run(event_id, message);
  const commId = info.lastInsertRowid;
  // create a receipt row per guest (simulating delivery)
  const guests = db.prepare('SELECT id FROM guests WHERE event_id = ?').all(event_id);
  const insert = db.prepare('INSERT INTO comm_receipts (comm_id, guest_id, seen) VALUES (?, ?, 0)');
  const tx = db.transaction((rows) => rows.forEach(g => insert.run(commId, g.id)));
  tx(guests);
  res.status(201).json({ id: commId, recipients: guests.length });
});

// GET /api/comms/:eventId — list messages with seen/received counts
router.get('/comms/:eventId', (req, res) => {
  const eventId = Number(req.params.eventId);
  const comms = db.prepare('SELECT * FROM communications WHERE event_id = ? ORDER BY created_at DESC').all(eventId);
  const withCounts = comms.map(c => {
    const total = db.prepare('SELECT COUNT(*) n FROM comm_receipts WHERE comm_id = ?').get(c.id).n;
    const seen  = db.prepare('SELECT COUNT(*) n FROM comm_receipts WHERE comm_id = ? AND seen = 1').get(c.id).n;
    return { ...c, total, seen };
  });
  res.json(withCounts);
});

// ----- Feedback -------------------------------------------------------------

// POST /api/feedback — guest submits post-event feedback
router.post('/feedback', (req, res) => {
  const { event_id, guest_id, overall, food, venue, organization, comment } = req.body;
  if (!event_id) return res.status(400).json({ error: 'event_id is required' });
  const info = db.prepare(`
    INSERT INTO feedback (event_id, guest_id, overall, food, venue, organization, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(event_id, guest_id || null, overall || null, food || null, venue || null, organization || null, comment || null);
  res.status(201).json({ id: info.lastInsertRowid, message: 'Thank you for your feedback!' });
});

// GET /api/feedback/:eventId — organizer views aggregated feedback
router.get('/feedback/:eventId', requireRole('organizer'), (req, res) => {
  const eventId = Number(req.params.eventId);
  const rows = db.prepare('SELECT * FROM feedback WHERE event_id = ? ORDER BY created_at DESC').all(eventId);
  const avg = (k) => rows.length ? +(rows.reduce((s, r) => s + (r[k] || 0), 0) / rows.length).toFixed(2) : 0;
  res.json({
    count: rows.length,
    averages: { overall: avg('overall'), food: avg('food'), venue: avg('venue'), organization: avg('organization') },
    comments: rows.filter(r => r.comment).map(r => r.comment),
    raw: rows,
  });
});

// ----- Event report ---------------------------------------------------------

// GET /api/reports/event/:id — costs, attendance and outcomes summary
router.get('/reports/event/:id', requireRole('organizer'), (req, res) => {
  const id = Number(req.params.id);
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const budget = db.prepare('SELECT COALESCE(SUM(planned),0) planned, COALESCE(SUM(actual),0) actual FROM budget_items WHERE event_id = ?').get(id);
  const guests = db.prepare('SELECT COUNT(*) total, SUM(rsvp_status = "attending") attending, SUM(checked_in = 1) checked_in FROM guests WHERE event_id = ?').get(id);
  const fb = db.prepare('SELECT COUNT(*) n, AVG(overall) avg_overall FROM feedback WHERE event_id = ?').get(id);
  const invoices = db.prepare('SELECT COALESCE(SUM(amount),0) total FROM invoices WHERE organizer_id = ?').get(event.organizer_id);

  res.json({
    event,
    costs: { planned: budget.planned, actual: budget.actual, variance: budget.planned - budget.actual, vendor_invoices: invoices.total },
    attendance: {
      invited: guests.total,
      attending: guests.attending || 0,
      checked_in: guests.checked_in || 0,
      attendance_rate: guests.total ? +(((guests.checked_in || 0) / guests.total) * 100).toFixed(1) : 0,
    },
    feedback: { responses: fb.n, avg_overall: fb.avg_overall ? +fb.avg_overall.toFixed(2) : 0 },
  });
});

// ----- Dashboard ------------------------------------------------------------

// GET /api/dashboard — role-aware summary numbers for the landing dashboard
router.get('/dashboard', (req, res) => {
  const { id, role } = req.user;
  if (role === 'organizer') {
    const events = db.prepare('SELECT COUNT(*) n FROM events WHERE organizer_id = ?').get(id).n;
    const tasks  = db.prepare('SELECT SUM(t.status != "done") open, COUNT(*) total FROM tasks t JOIN events e ON e.id = t.event_id WHERE e.organizer_id = ?').get(id);
    const guests = db.prepare('SELECT COUNT(*) n FROM guests g JOIN events e ON e.id = g.event_id WHERE e.organizer_id = ?').get(id).n;
    const fb = db.prepare('SELECT AVG(overall) a FROM feedback f JOIN events e ON e.id = f.event_id WHERE e.organizer_id = ?').get(id);
    return res.json({
      role,
      events,
      openTasks: tasks.open || 0,
      totalTasks: tasks.total || 0,
      guests,
      avgFeedback: fb.a ? +fb.a.toFixed(2) : null,
    });
  }
  if (role === 'staff') {
    const t = db.prepare('SELECT SUM(status != "done") open, COUNT(*) total FROM tasks WHERE assignee_id = ?').get(id);
    return res.json({ role, openTasks: t.open || 0, totalTasks: t.total || 0 });
  }
  if (role === 'vendor') {
    const reqs = db.prepare('SELECT COUNT(*) n FROM sourcing_requests WHERE vendor_id = ?').get(id).n;
    const inv  = db.prepare('SELECT SUM(status != "paid") open, COUNT(*) total FROM invoices WHERE vendor_id = ?').get(id);
    return res.json({ role, requests: reqs, openInvoices: inv.open || 0, totalInvoices: inv.total || 0 });
  }
  if (role === 'venue_owner') {
    const venues = db.prepare('SELECT COUNT(*) n FROM venues WHERE owner_id = ?').get(id).n;
    const pending = db.prepare('SELECT COUNT(*) n FROM bookings b JOIN venues v ON v.id = b.venue_id WHERE v.owner_id = ? AND b.status = "pending"').get(id).n;
    return res.json({ role, venues, pendingBookings: pending });
  }
  if (role === 'guest') {
    const g = db.prepare('SELECT COUNT(*) n FROM guests WHERE email = (SELECT email FROM users WHERE id = ?)').get(id).n;
    return res.json({ role, invitations: g });
  }
  res.json({ role });
});

// ----- Guest self-service (invitations, RSVP, messages) ---------------------

// GET /api/my/invitations — guest's own invitations with event details
router.get('/my/invitations', requireRole('guest'), (req, res) => {
  const rows = db.prepare(`
    SELECT g.*, e.name AS event_name, e.description AS event_description, e.theme,
           e.start_date, e.end_date,
           v.name AS venue_name, v.location AS venue_location, v.city AS venue_city
    FROM guests g
    JOIN events e ON e.id = g.event_id
    LEFT JOIN venues v ON v.id = e.venue_id
    WHERE g.email = (SELECT email FROM users WHERE id = ?)
    ORDER BY e.start_date
  `).all(req.user.id);
  res.json(rows);
});

// PATCH /api/my/invitations/:id/rsvp — guest responds / updates their RSVP
router.patch('/my/invitations/:id/rsvp', requireRole('guest'), (req, res) => {
  const id = Number(req.params.id);
  const mine = db.prepare(
    'SELECT id FROM guests WHERE id = ? AND email = (SELECT email FROM users WHERE id = ?)'
  ).get(id, req.user.id);
  if (!mine) return res.status(404).json({ error: 'Invitation not found' });
  const { rsvp_status, dietary } = req.body;
  if (!['attending', 'not_attending', 'maybe'].includes(rsvp_status)) {
    return res.status(400).json({ error: 'rsvp_status must be attending, not_attending or maybe' });
  }
  db.prepare('UPDATE guests SET rsvp_status = ?, dietary = COALESCE(?, dietary) WHERE id = ?')
    .run(rsvp_status, dietary ?? null, id);
  res.json({ ok: true, message: 'RSVP recorded. Thank you!' });
});

// GET /api/my/messages — day-of messages addressed to this guest (+ seen status)
router.get('/my/messages', requireRole('guest'), (req, res) => {
  const rows = db.prepare(`
    SELECT r.id AS receipt_id, r.seen, c.message, c.created_at, e.name AS event_name
    FROM comm_receipts r
    JOIN communications c ON c.id = r.comm_id
    JOIN events e ON e.id = c.event_id
    JOIN guests g ON g.id = r.guest_id
    WHERE g.email = (SELECT email FROM users WHERE id = ?)
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  res.json(rows);
});

// PATCH /api/my/messages/:rid/seen — guest marks a message as seen
router.patch('/my/messages/:rid/seen', requireRole('guest'), (req, res) => {
  const rid = Number(req.params.rid);
  const mine = db.prepare(`
    SELECT r.id FROM comm_receipts r JOIN guests g ON g.id = r.guest_id
    WHERE r.id = ? AND g.email = (SELECT email FROM users WHERE id = ?)
  `).get(rid, req.user.id);
  if (!mine) return res.status(404).json({ error: 'Message not found' });
  db.prepare('UPDATE comm_receipts SET seen = 1 WHERE id = ?').run(rid);
  res.json({ ok: true });
});

// POST /api/comms/:id/followup — organizer re-sends only to guests who have NOT seen it
router.post('/comms/:id/followup', requireRole('organizer'), (req, res) => {
  const commId = Number(req.params.id);
  const orig = db.prepare('SELECT * FROM communications WHERE id = ?').get(commId);
  if (!orig) return res.status(404).json({ error: 'Original message not found' });
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'message is required' });

  const unseen = db.prepare('SELECT guest_id FROM comm_receipts WHERE comm_id = ? AND seen = 0').all(commId);
  if (!unseen.length) return res.json({ recipients: 0, info: 'Everyone has already seen the original message.' });

  const info = db.prepare('INSERT INTO communications (event_id, message) VALUES (?, ?)').run(orig.event_id, message);
  const ins = db.prepare('INSERT INTO comm_receipts (comm_id, guest_id, seen) VALUES (?, ?, 0)');
  unseen.forEach((u) => ins.run(info.lastInsertRowid, u.guest_id));
  res.status(201).json({ id: info.lastInsertRowid, recipients: unseen.length });
});

// ----- Venue owner performance report ---------------------------------------

// GET /api/reports/owner — bookings, booking rate and revenue per listing
router.get('/reports/owner', requireRole('venue_owner'), (req, res) => {
  const venues = db.prepare(`
    SELECT v.id, v.name, v.price_per_day,
      (SELECT COUNT(*) FROM bookings b WHERE b.venue_id = v.id) AS requests,
      (SELECT COUNT(*) FROM bookings b WHERE b.venue_id = v.id AND b.status = 'approved') AS approved
    FROM venues v WHERE v.owner_id = ?
    ORDER BY v.name
  `).all(req.user.id);
  const rows = venues.map((v) => ({
    ...v,
    booking_rate: v.requests ? +((v.approved / v.requests) * 100).toFixed(1) : 0,
    revenue: v.approved * v.price_per_day,
  }));
  const totals = rows.reduce((a, r) => ({
    requests: a.requests + r.requests, approved: a.approved + r.approved, revenue: a.revenue + r.revenue,
  }), { requests: 0, approved: 0, revenue: 0 });
  res.json({ venues: rows, totals });
});

export default router;
