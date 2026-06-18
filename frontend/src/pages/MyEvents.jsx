// src/pages/MyEvents.jsx — staff view the events they participate in, filterable by date.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';

export default function MyEvents() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    api.get(`/events?${p.toString()}`).then(setEvents).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  const { sorted, sort, toggle } = useSort(events, 'start_date');

  return (
    <>
      <div className="topbar"><h1>My events</h1><p>The events you're working on, with dates and venues.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>From</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label>To</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button className="btn" onClick={load}>Filter</button>
        </div>
        <div className="card">
          {loading ? <Spinner label="Loading events…" /> : events.length === 0 ? (
            <EmptyState variant="events" title="No events in this range" hint="Adjust the date filter to see more." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <SortTh label="Event" sortKey="name" sort={sort} toggle={toggle} />
                  <SortTh label="Theme" sortKey="theme" sort={sort} toggle={toggle} />
                  <SortTh label="Date" sortKey="start_date" sort={sort} toggle={toggle} />
                  <SortTh label="Venue" sortKey="venue_name" sort={sort} toggle={toggle} />
                </tr></thead>
                <tbody>
                  {sorted.map((ev) => (
                    <tr key={ev.id}>
                      <td><b>{ev.name}</b>{ev.description && <><br /><span className="muted">{ev.description}</span></>}</td>
                      <td>{ev.theme || '—'}</td>
                      <td>{ev.start_date || '—'}{ev.end_date && ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ''}</td>
                      <td>{ev.venue_name || '—'}</td>
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
