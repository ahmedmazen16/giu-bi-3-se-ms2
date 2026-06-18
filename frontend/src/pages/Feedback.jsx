// src/pages/Feedback.jsx — guests submit post-event feedback; organizers view aggregates.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { FieldError } from '../validation.jsx';

export default function Feedback() {
  const { user } = useAuth();
  return user.role === 'guest' ? <GuestFeedback /> : <OrganizerFeedback />;
}

function Stars({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => onChange(n)}
          style={{ cursor: 'pointer', fontSize: 26, color: n <= value ? 'var(--gold)' : 'var(--line)' }}>★</span>
      ))}
    </div>
  );
}

/* ---------------- Guest: submit feedback ---------------- */
function GuestFeedback() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [r, setR] = useState({ overall: 0, food: 0, venue: 0, organization: 0, comment: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/events')
      .then((evs) => { setEvents(evs); if (evs[0]) setEventId(String(evs[0].id)); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!eventId) { setErr('Please choose an event'); return; }
    if (!r.overall) { setErr('Please give an overall rating'); return; }
    setErr('');
    try {
      await api.post('/feedback', { event_id: Number(eventId), ...r });
      toast.success('Thank you! Your feedback has been submitted.');
      setR({ overall: 0, food: 0, venue: 0, organization: 0, comment: '' });
    } catch (e2) { toast.error(e2.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Share your feedback</h1><p>Tell the organizer how the event went.</p></div>
      <div className="content">
        {loading ? <Spinner /> : (
          <div className="card" style={{ maxWidth: 560 }}>
            <form onSubmit={submit} noValidate>
              <div className="field"><label>Event</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Overall experience</label><Stars value={r.overall} onChange={(v) => setR({ ...r, overall: v })} />
                <FieldError msg={err} />
              </div>
              <div className="row">
                <div className="field"><label>Food & beverages</label><Stars value={r.food} onChange={(v) => setR({ ...r, food: v })} /></div>
                <div className="field"><label>Venue</label><Stars value={r.venue} onChange={(v) => setR({ ...r, venue: v })} /></div>
              </div>
              <div className="field"><label>Organization</label><Stars value={r.organization} onChange={(v) => setR({ ...r, organization: v })} /></div>
              <div className="field"><label>Comments</label><textarea value={r.comment} onChange={(e) => setR({ ...r, comment: e.target.value })} placeholder="Anything you'd like to share…" /></div>
              <button className="btn">Submit feedback</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Organizer: aggregated feedback ---------------- */
function OrganizerFeedback() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/events').then((evs) => { setEvents(evs); if (evs[0]) setEventId(String(evs[0].id)); }).catch((e) => toast.error(e.message));
  }, []);
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.get(`/feedback/${eventId}`).then(setData).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [eventId]);

  return (
    <>
      <div className="topbar"><h1>Feedback</h1><p>See how your guests rated each event.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>Event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>
        {loading || !data ? <Spinner label="Loading feedback…" /> : data.count === 0 ? (
          <EmptyState variant="feedback" title="No feedback collected yet" hint="Responses will appear here after guests rate this event." />
        ) : (
          <>
            <div className="grid cols-4" style={{ marginBottom: 22 }}>
              <div className="stat"><div className="label">Overall</div><div className="value">{data.averages.overall}</div><div className="hint">/ 5 · {data.count} responses</div></div>
              <div className="stat"><div className="label">Food</div><div className="value">{data.averages.food}</div><div className="hint">/ 5</div></div>
              <div className="stat"><div className="label">Venue</div><div className="value">{data.averages.venue}</div><div className="hint">/ 5</div></div>
              <div className="stat"><div className="label">Organization</div><div className="value">{data.averages.organization}</div><div className="hint">/ 5</div></div>
            </div>
            <div className="card">
              <h3>Comments</h3>
              {data.comments.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>No written comments.</p> : (
                <ul style={{ marginTop: 10, paddingLeft: 18, lineHeight: 1.9 }}>
                  {data.comments.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
