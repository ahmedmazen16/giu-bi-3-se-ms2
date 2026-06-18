// src/pages/Dashboard.jsx — role-aware dashboard: stats + role-specific extras
// (organizer: due-task reminders · venue owner: performance report · vendor: profile).
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setD).catch((e) => toast.error(e.message));
  }, []);

  return (
    <>
      <div className="topbar">
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
        <p>Here's a snapshot of what's happening across your events.</p>
      </div>
      <div className="content">
        {!d ? <Spinner label="Loading your dashboard…" /> : (
          <div className="grid cols-4">
            {user.role === 'organizer' && <>
              <Stat label="Events" value={d.events} hint="planned & active" />
              <Stat label="Open tasks" value={d.openTasks} hint={`of ${d.totalTasks} total`} />
              <Stat label="Guests" value={d.guests} hint="across all events" />
              <Stat label="Avg feedback" value={d.avgFeedback ?? '—'} hint="out of 5" />
            </>}
            {user.role === 'staff' && <>
              <Stat label="My open tasks" value={d.openTasks} hint={`of ${d.totalTasks} assigned`} />
              <Stat label="Completed" value={d.totalTasks - d.openTasks} hint="tasks done" />
            </>}
            {user.role === 'vendor' && <>
              <Stat label="Sourcing requests" value={d.requests} hint="received" />
              <Stat label="Open invoices" value={d.openInvoices} hint={`of ${d.totalInvoices} submitted`} />
            </>}
            {user.role === 'venue_owner' && <>
              <Stat label="My venues" value={d.venues} hint="listed" />
              <Stat label="Pending bookings" value={d.pendingBookings} hint="awaiting your reply" />
            </>}
            {user.role === 'guest' && <>
              <Stat label="My invitations" value={d.invitations} hint="events you're invited to" />
            </>}
          </div>
        )}

        {user.role === 'organizer' && <DueTasks />}
        {user.role === 'venue_owner' && <OwnerReport />}
        {user.role === 'vendor' && <VendorProfile />}

        <div className="card" style={{ marginTop: 22 }}>
          <h3>Getting around</h3>
          <p className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
            {user.role === 'organizer' && 'Use the sidebar to create events, search and book venues, assign tasks to staff, manage budgets, source from vendors, invite guests, send day-of updates, and generate post-event reports.'}
            {user.role === 'staff' && 'My Events shows the events you are working on. My Tasks is where you update progress. On event day, use Check-In to mark guests as arrived and Vendor Arrivals when deliveries show up.'}
            {user.role === 'vendor' && 'Open Requests to accept or decline sourcing requests and update delivery status. Submit and track your invoices under Invoices, and keep your profile below up to date.'}
            {user.role === 'venue_owner' && 'Manage your space listings under My Venues, and approve or decline organizer booking requests under Requests. Your performance summary is shown above.'}
            {user.role === 'guest' && 'Open Invitations to see your event invitations, RSVP with your dietary preferences, and read day-of messages. After an event, share your thoughts on the Feedback page.'}
          </p>
        </div>
      </div>
    </>
  );
}

/* Organizer: reminders of tasks due in the next 30 days */
function DueTasks() {
  const [due, setDue] = useState([]);
  useEffect(() => {
    api.get('/tasks').then((tasks) => {
      const today = new Date().toISOString().slice(0, 10);
      const horizon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      setDue(tasks
        .filter((t) => t.status !== 'done' && t.due_date && t.due_date >= today && t.due_date <= horizon)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 6));
    }).catch(() => {});
  }, []);
  return (
    <div className="card" style={{ marginTop: 22 }}>
      <h3>⏰ Due soon (next 30 days)</h3>
      {due.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>No upcoming task deadlines. Nice and calm.</p> : (
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Task</th><th>Event</th><th>Assignee</th><th>Due</th></tr></thead>
          <tbody>
            {due.map((t) => (
              <tr key={t.id}>
                <td><b>{t.title}</b></td>
                <td>{t.event_name}</td>
                <td>{t.assignee_name || <span className="muted">unassigned</span>}</td>
                <td>{t.due_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* Venue owner: performance & revenue per listing */
function OwnerReport() {
  const [r, setR] = useState(null);
  useEffect(() => { api.get('/reports/owner').then(setR).catch(() => {}); }, []);
  if (!r) return null;
  return (
    <div className="card" style={{ marginTop: 22 }}>
      <h3>Performance & revenue</h3>
      {r.venues.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>List a venue to start receiving bookings.</p> : (
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Venue</th><th>Requests</th><th>Approved</th><th>Booking rate</th><th>Revenue</th></tr></thead>
          <tbody>
            {r.venues.map((v) => (
              <tr key={v.id}>
                <td><b>{v.name}</b></td>
                <td>{v.requests}</td>
                <td>{v.approved}</td>
                <td>{v.booking_rate}%</td>
                <td>{v.revenue.toLocaleString()} EGP</td>
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              <td><b>{r.totals.requests}</b></td>
              <td><b>{r.totals.approved}</b></td>
              <td>—</td>
              <td><b>{r.totals.revenue.toLocaleString()} EGP</b></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

/* Vendor: editable profile (company, supplies, location, pricing, phone) */
function VendorProfile() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    company: user.company || '', supplies: user.supplies || '',
    location: user.location || '', pricing: user.pricing || '', phone: user.phone || '',
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    try { await api.patch(`/users/${user.id}`, form); toast.success('Profile updated.'); }
    catch (e2) { toast.error(e2.message); }
  }

  return (
    <div className="card" style={{ marginTop: 22 }}>
      <h3>My vendor profile</h3>
      <form onSubmit={save} style={{ marginTop: 12 }}>
        <div className="row">
          <div className="field"><label>Company name</label><input value={form.company} onChange={set('company')} /></div>
          <div className="field"><label>Main location</label><input value={form.location} onChange={set('location')} /></div>
        </div>
        <div className="field"><label>Supplies offered</label><input value={form.supplies} onChange={set('supplies')} placeholder="Coffee beans, pastries…" /></div>
        <div className="row">
          <div className="field"><label>Pricing</label><input value={form.pricing} onChange={set('pricing')} placeholder="From 500 EGP" /></div>
          <div className="field"><label>Contact phone</label><input value={form.phone} onChange={set('phone')} /></div>
        </div>
        <button className="btn">Save profile</button>
      </form>
    </div>
  );
}
