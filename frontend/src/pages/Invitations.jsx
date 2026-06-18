// src/pages/Invitations.jsx — guest views invitations, RSVPs, and reads day-of messages.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s.replace(/_/g, ' ')}</span>;

export default function Invitations() {
  const toast = useToast();
  const [invitations, setInvitations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [dietary, setDietary] = useState({});
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/my/invitations').then((rows) => {
      setInvitations(rows);
      const d = {}; rows.forEach((r) => { d[r.id] = r.dietary || ''; });
      setDietary(d);
    }).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
    api.get('/my/messages').then(setMessages).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  async function rsvp(inv, status) {
    try {
      const r = await api.patch(`/my/invitations/${inv.id}/rsvp`, { rsvp_status: status, dietary: dietary[inv.id] || null });
      toast.success(r.message || 'RSVP recorded. Thank you!');
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function markSeen(receiptId) {
    try { await api.patch(`/my/messages/${receiptId}/seen`); load(); } catch (e) { toast.error(e.message); }
  }

  return (
    <>
      <div className="topbar"><h1>My invitations</h1><p>View your event invitations, respond, and catch live updates.</p></div>
      <div className="content">
        {loading ? <Spinner label="Loading invitations…" /> : invitations.length === 0 ? (
          <EmptyState variant="invitations" title="No invitations yet" hint="When an organizer invites you, it will appear here." />
        ) : (
          <div className="grid cols-2">
            {invitations.map((inv) => (
              <div className="card" key={inv.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3>{inv.event_name}</h3>
                  <Badge s={inv.rsvp_status} />
                </div>
                <div className="muted" style={{ margin: '6px 0 10px' }}>
                  {inv.start_date || 'Date TBA'}{inv.end_date && inv.end_date !== inv.start_date ? ` → ${inv.end_date}` : ''}
                  {inv.venue_name ? ` · ${inv.venue_name}, ${inv.venue_city}` : ''}
                </div>
                {inv.theme && <span className="tag">{inv.theme}</span>}
                {inv.event_description && <p style={{ fontSize: 14, marginTop: 10 }}>{inv.event_description}</p>}

                <div className="field" style={{ marginTop: 12 }}>
                  <label>Dietary preference / special requirements</label>
                  <input value={dietary[inv.id] || ''} onChange={(e) => setDietary({ ...dietary, [inv.id]: e.target.value })} placeholder="Vegetarian, allergies…" />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn sage small" onClick={() => rsvp(inv, 'attending')}>Attending</button>
                  <button className="btn ghost small" onClick={() => rsvp(inv, 'maybe')}>Maybe</button>
                  <button className="btn ghost small" onClick={() => rsvp(inv, 'not_attending')}>Can't make it</button>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>You can change your response any time before the event.</div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ marginTop: 22 }}>
          <h3>Day-of messages</h3>
          {messages.length === 0 ? <p className="muted" style={{ marginTop: 8 }}>No messages from organizers yet.</p> : (
            <div style={{ marginTop: 6 }}>
              {messages.map((m) => (
                <div key={m.receipt_id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14 }}>{m.message}</div>
                    <div className="muted" style={{ fontSize: 12.5 }}>{m.event_name}</div>
                  </div>
                  {m.seen
                    ? <span className="badge done">seen</span>
                    : <button className="btn ghost small" onClick={() => markSeen(m.receipt_id)}>Mark as seen</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
