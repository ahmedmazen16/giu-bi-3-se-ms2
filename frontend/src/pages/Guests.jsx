// src/pages/Guests.jsx — guest list, invitations, RSVPs, check-in, and day-of messages.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, isEmail, FieldError } from '../validation.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s.replace(/_/g, ' ')}</span>;

export default function Guests() {
  const { user } = useAuth();
  const toast = useToast();
  const isStaff = user.role === 'staff';
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [guests, setGuests] = useState([]);
  const [filters, setFilters] = useState({ rsvp_status: '', dietary: '', q: '' });
  const [form, setForm] = useState({ name: '', email: '', dietary: '' });
  const [errors, setErrors] = useState({});
  const [comms, setComms] = useState([]);
  const [message, setMessage] = useState('');
  const [msgErr, setMsgErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(null); // guest just checked in (for the confirmation screen)

  useEffect(() => {
    api.get('/events')
      .then((evs) => { setEvents(evs); if (evs[0]) setEventId(String(evs[0].id)); else setLoading(false); })
      .catch((e) => { toast.error(e.message); setLoading(false); });
  }, []);

  function load() {
    if (!eventId) return;
    setLoading(true);
    const p = new URLSearchParams({ event_id: eventId });
    if (filters.rsvp_status) p.set('rsvp_status', filters.rsvp_status);
    if (filters.dietary) p.set('dietary', filters.dietary);
    if (filters.q) p.set('q', filters.q);
    api.get(`/guests?${p.toString()}`)
      .then(setGuests)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    if (!isStaff) api.get(`/comms/${eventId}`).then(setComms).catch(() => {});
  }
  useEffect(() => { load(); }, [eventId]);

  const currentEvent = events.find((e) => String(e.id) === String(eventId));

  async function addGuest(e) {
    e.preventDefault();
    const errs = runValidation(form, {
      name: (v) => isBlank(v) && 'Guest name is required',
      email: (v) => (isBlank(v) ? 'Email is required' : !isEmail(v) && 'Enter a valid email address'),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/guests', { event_id: Number(eventId), ...form });
      toast.success('Guest added.');
      setForm({ name: '', email: '', dietary: '' });
      load();
    } catch (e2) { toast.error(e2.message); }
  }
  async function invite(id) {
    try { await api.post(`/guests/${id}/invite`); toast.success('Invitation sent.'); load(); }
    catch (e) { toast.error(e.message); }
  }
  async function checkin(g) {
    try {
      await api.patch(`/guests/${g.id}/checkin`);
      setConfirmed(g); // show the confirmation screen
      load();
    } catch (e) { toast.error(e.message); }
  }
  async function remove(id) {
    if (!confirm('Remove guest?')) return;
    try { await api.del(`/guests/${id}`); toast.success('Guest removed.'); load(); }
    catch (e) { toast.error(e.message); }
  }

  async function followUp(c) {
    const text = prompt(`Follow-up message to the ${c.total - c.seen} guest(s) who have not seen this yet:`);
    if (!text) return;
    try {
      const r = await api.post(`/comms/${c.id}/followup`, { message: text });
      toast.success(r.recipients ? `Follow-up sent to ${r.recipients} guest(s).` : 'Everyone has already seen the original message.');
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function sendComm(e) {
    e.preventDefault();
    if (isBlank(message)) { setMsgErr('Please type a message to broadcast'); return; }
    setMsgErr('');
    try { await api.post('/comms', { event_id: Number(eventId), message }); setMessage(''); toast.success('Message sent to all guests.'); load(); }
    catch (e2) { toast.error(e2.message); }
  }

  const arrived = guests.filter((g) => g.checked_in).length;
  const { sorted, sort, toggle } = useSort(guests, 'name');

  return (
    <>
      <div className="topbar">
        <h1>{isStaff ? 'Guest check-in' : 'Guests'}</h1>
        <p>{isStaff ? 'Mark guests as arrived on event day.' : 'Invite guests, track RSVPs and dietary needs, and send day-of updates.'}</p>
      </div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>Event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div className="field"><label>RSVP</label>
            <select value={filters.rsvp_status} onChange={(e) => setFilters({ ...filters, rsvp_status: e.target.value })}>
              <option value="">All</option><option value="attending">Attending</option><option value="maybe">Maybe</option>
              <option value="not_attending">Not attending</option><option value="pending">Pending</option>
            </select>
          </div>
          <div className="field"><label>Dietary</label><input value={filters.dietary} onChange={(e) => setFilters({ ...filters, dietary: e.target.value })} placeholder="Vegan…" /></div>
          <div className="field"><label>Search</label><input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="name / email" /></div>
          <button className="btn" onClick={load}>Apply</button>
        </div>

        {isStaff && (
          <div className="grid cols-3" style={{ marginBottom: 22 }}>
            <div className="stat"><div className="label">Total guests</div><div className="value">{guests.length}</div></div>
            <div className="stat"><div className="label">Arrived</div><div className="value">{arrived}</div></div>
            <div className="stat"><div className="label">Yet to arrive</div><div className="value">{guests.length - arrived}</div></div>
          </div>
        )}

        <div className="card">
          <h3>Guest list ({guests.length})</h3>
          {loading ? <Spinner label="Loading guests…" /> : guests.length === 0 ? (
            <EmptyState variant="guests" title="No guests yet" hint={isStaff ? 'Guests will appear here once added.' : 'Add a guest below to get started.'} />
          ) : (
            <div className="table-wrap">
              <table style={{ marginTop: 10 }}>
                <thead><tr>
                  <SortTh label="Name" sortKey="name" sort={sort} toggle={toggle} />
                  <SortTh label="Email" sortKey="email" sort={sort} toggle={toggle} />
                  <SortTh label="RSVP" sortKey="rsvp_status" sort={sort} toggle={toggle} />
                  <SortTh label="Dietary" sortKey="dietary" sort={sort} toggle={toggle} />
                  <SortTh label="Invited" sortKey="invited" sort={sort} toggle={toggle} />
                  <SortTh label="Checked in" sortKey="checked_in" sort={sort} toggle={toggle} />
                  <th>Action</th>
                </tr></thead>
                <tbody>
                  {sorted.map((g) => (
                    <tr key={g.id}>
                      <td><b>{g.name}</b></td>
                      <td className="muted">{g.email}</td>
                      <td><Badge s={g.rsvp_status} /></td>
                      <td>{g.dietary || '—'}</td>
                      <td>{g.invited ? '✓' : '—'}</td>
                      <td>{g.checked_in ? '✓' : '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isStaff ? (
                          g.checked_in ? <span className="muted">arrived</span> : <button className="btn sage small" onClick={() => checkin(g)}>Check in</button>
                        ) : (
                          <>
                            {!g.invited && <button className="btn ghost small" onClick={() => invite(g.id)}>Invite</button>}{' '}
                            {!g.checked_in && <button className="btn ghost small" onClick={() => checkin(g)}>Check in</button>}{' '}
                            <button className="btn ghost small" onClick={() => remove(g.id)}>✕</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!isStaff && (
          <div className="grid cols-2" style={{ marginTop: 22 }}>
            <div className="card">
              <h3>Add a guest</h3>
              <form onSubmit={addGuest} style={{ marginTop: 12 }} noValidate>
                <div className="field"><label>Name</label>
                  <input className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <FieldError msg={errors.name} />
                </div>
                <div className="field"><label>Email</label>
                  <input className={errors.email ? 'invalid' : ''} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <FieldError msg={errors.email} />
                </div>
                <div className="field"><label>Dietary preference</label><input value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} placeholder="Vegetarian, Vegan…" /></div>
                <button className="btn">Add guest</button>
              </form>
            </div>
            <div className="card">
              <h3>Day-of communications</h3>
              <form onSubmit={sendComm} style={{ marginTop: 12 }} noValidate>
                <div className="field"><label>Broadcast a message to all guests</label>
                  <textarea className={msgErr ? 'invalid' : ''} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Doors open at 10am…" />
                  <FieldError msg={msgErr} />
                </div>
                <button className="btn">Send message</button>
              </form>
              <div style={{ marginTop: 14 }}>
                {comms.map((c) => (
                  <div key={c.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14 }}>{c.message}</div>
                      <div className="muted" style={{ fontSize: 12.5 }}>Seen by {c.seen} of {c.total} guests</div>
                    </div>
                    {c.seen < c.total && (
                      <button className="btn ghost small" onClick={() => followUp(c)}>Follow up ({c.total - c.seen} unseen)</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmed && (
        <CheckinConfirmation guest={confirmed} event={currentEvent} onClose={() => setConfirmed(null)} />
      )}
    </>
  );
}

/* ---------------- Check-in confirmation screen ---------------- */
function CheckinConfirmation({ guest, event, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="checkin-check">✓</div>
        <div className="checkin-sub">Checked in</div>
        <div className="checkin-name">{guest.name}</div>
        <div className="checkin-detail">
          {event ? (
            <>
              Welcome to <b>{event.name}</b>
              {event.start_date && <><br />{event.start_date}</>}
              {event.venue_name && <> · {event.venue_name}</>}
            </>
          ) : 'Enjoy the event!'}
        </div>
        <div className="checkin-meta">
          <span className="badge attending">{guest.rsvp_status.replace(/_/g, ' ')}</span>
          {guest.dietary && <span className="tag">{guest.dietary}</span>}
        </div>
        <div style={{ marginTop: 22 }}>
          <button className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
