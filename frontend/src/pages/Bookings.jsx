// src/pages/Bookings.jsx — organizers track requests; venue owners approve/decline.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s}</span>;

export default function Bookings() {
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user.role === 'venue_owner';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/bookings').then(setRows).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function respond(id, status) {
    let owner_message = '';
    if (status === 'declined' || status === 'approved') {
      owner_message = prompt(`Optional message to the organizer (${status}):`) || '';
    }
    try { await api.patch(`/bookings/${id}`, { status, owner_message }); toast.success(`Booking ${status}.`); load(); }
    catch (e) { toast.error(e.message); }
  }

  const { sorted, sort, toggle } = useSort(rows, 'event_date');

  return (
    <>
      <div className="topbar">
        <h1>{isOwner ? 'Booking requests' : 'My bookings'}</h1>
        <p>{isOwner ? 'Respond to organizers who want to book your spaces.' : 'Track the status of your venue applications.'}</p>
      </div>
      <div className="content">
        <div className="card">
          {loading ? <Spinner label="Loading bookings…" /> : rows.length === 0 ? (
            <EmptyState variant="bookings" title="No bookings yet" hint={isOwner ? 'Requests from organizers will appear here.' : 'Apply to a venue to see it here.'} />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortTh label="Venue" sortKey="venue_name" sort={sort} toggle={toggle} />
                    {isOwner
                      ? <SortTh label="Organizer" sortKey="organizer_name" sort={sort} toggle={toggle} />
                      : <SortTh label="City" sortKey="city" sort={sort} toggle={toggle} />}
                    <SortTh label="Date" sortKey="event_date" sort={sort} toggle={toggle} />
                    <SortTh label="Attendees" sortKey="attendees" sort={sort} toggle={toggle} />
                    <SortTh label="Status" sortKey="status" sort={sort} toggle={toggle} />
                    <th>Message</th>{isOwner && <th>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr key={b.id}>
                      <td><b>{b.venue_name}</b></td>
                      <td>{isOwner ? b.organizer_name : b.city}</td>
                      <td>{b.event_date}</td>
                      <td>{b.attendees || '—'}</td>
                      <td><Badge s={b.status} /></td>
                      <td className="muted">{b.owner_message || b.notes || '—'}</td>
                      {isOwner && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {b.status === 'pending' ? (
                            <>
                              <button className="btn sage small" onClick={() => respond(b.id, 'approved')}>Approve</button>{' '}
                              <button className="btn ghost small" onClick={() => respond(b.id, 'declined')}>Decline</button>
                            </>
                          ) : <span className="muted">—</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
