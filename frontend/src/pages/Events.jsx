// src/pages/Events.jsx — organizer creates and manages events.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, FieldError } from '../validation.jsx';

const blank = { name: '', theme: '', description: '', start_date: '', end_date: '', planned_budget: '' };

// Event lifecycle. The DB stores 'planning' by default; these are the display labels.
const STATUS_LABEL = { planning: 'Planning', active: 'Active', completed: 'Completed' };
const STATUS_NEXT = { planning: 'active', active: 'completed', completed: 'planning' };
const statusOf = (ev) => (ev.status && STATUS_LABEL[ev.status] ? ev.status : 'planning');

export default function Events() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState({ from: '', to: '' });

  const load = (f = dates) => {
    setLoading(true);
    const p = new URLSearchParams();
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    api.get(`/events?${p.toString()}`)
      .then(setEvents)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); api.get('/venues').then(setVenues).catch(() => {}); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    return runValidation(form, {
      name: (v) => isBlank(v) && 'Event name is required',
      end_date: (v, vals) => v && vals.start_date && v < vals.start_date && 'End date can’t be before the start date',
    });
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const payload = { ...form, planned_budget: Number(form.planned_budget) || 0, venue_id: form.venue_id || null };
      if (editId) { await api.put(`/events/${editId}`, payload); toast.success('Event updated.'); }
      else { await api.post('/events', payload); toast.success('Event created.'); }
      setForm(blank); setEditId(null); setErrors({}); load();
    } catch (e2) { toast.error(e2.message); }
  }

  function edit(ev) {
    setEditId(ev.id);
    setErrors({});
    setForm({
      name: ev.name || '', theme: ev.theme || '', description: ev.description || '',
      start_date: ev.start_date || '', end_date: ev.end_date || '',
      planned_budget: ev.planned_budget || '', venue_id: ev.venue_id || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id) {
    if (!confirm('Delete this event?')) return;
    try { await api.del(`/events/${id}`); toast.success('Event deleted.'); load(); }
    catch (e) { toast.error(e.message); }
  }

  async function cycleStatus(ev) {
    const next = STATUS_NEXT[statusOf(ev)];
    setEvents((prev) => prev.map((x) => (x.id === ev.id ? { ...x, status: next } : x)));
    try { await api.put(`/events/${ev.id}`, { status: next }); toast.success(`Marked “${ev.name}” as ${STATUS_LABEL[next]}.`); }
    catch (e) { toast.error(e.message); load(); }
  }

  const { sorted, sort, toggle } = useSort(events, 'start_date');

  return (
    <>
      <div className="topbar"><h1>Events</h1><p>Plan and manage your pop-up café events.</p></div>
      <div className="content">
        <div className="grid cols-2">
          <div className="card">
            <h3>{editId ? 'Edit event' : 'Create a new event'}</h3>
            <form onSubmit={submit} style={{ marginTop: 14 }} noValidate>
              <div className="field"><label>Event name</label>
                <input className={errors.name ? 'invalid' : ''} value={form.name} onChange={set('name')} />
                <FieldError msg={errors.name} />
              </div>
              <div className="row">
                <div className="field"><label>Theme</label><input value={form.theme} onChange={set('theme')} placeholder="Minimalist, Bohemian…" /></div>
                <div className="field"><label>Planned budget (EGP)</label><input type="number" value={form.planned_budget} onChange={set('planned_budget')} /></div>
              </div>
              <div className="row">
                <div className="field"><label>Start date</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
                <div className="field"><label>End date</label>
                  <input type="date" className={errors.end_date ? 'invalid' : ''} value={form.end_date} onChange={set('end_date')} />
                  <FieldError msg={errors.end_date} />
                </div>
              </div>
              <div className="field">
                <label>Venue (optional)</label>
                <select value={form.venue_id || ''} onChange={set('venue_id')}>
                  <option value="">— none yet —</option>
                  {venues.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.city}</option>)}
                </select>
              </div>
              <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
              <button className="btn">{editId ? 'Save changes' : 'Create event'}</button>
              {editId && <button type="button" className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setForm(blank); setEditId(null); setErrors({}); }}>Cancel</button>}
            </form>
          </div>

          <div className="card">
            <div className="section-title"><h3>Your events ({events.length})</h3></div>
            <div className="toolbar">
              <div className="field"><label>From</label><input type="date" value={dates.from} onChange={(e) => setDates({ ...dates, from: e.target.value })} /></div>
              <div className="field"><label>To</label><input type="date" value={dates.to} onChange={(e) => setDates({ ...dates, to: e.target.value })} /></div>
              <button type="button" className="btn ghost small" onClick={() => load()}>Filter by date</button>
            </div>
            {loading ? <Spinner label="Loading events…" /> : events.length === 0 ? (
              <EmptyState variant="events" title="No events yet" hint="Create your first one on the left." />
            ) : (
              <div className="table-wrap">
                <table style={{ marginTop: 10 }}>
                  <thead><tr>
                    <SortTh label="Name" sortKey="name" sort={sort} toggle={toggle} />
                    <SortTh label="Date" sortKey="start_date" sort={sort} toggle={toggle} />
                    <SortTh label="Status" sortKey="status" sort={sort} toggle={toggle} />
                    <SortTh label="Venue" sortKey="venue_name" sort={sort} toggle={toggle} />
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((ev) => (
                      <tr key={ev.id}>
                        <td><b>{ev.name}</b><br /><span className="muted">{ev.theme}</span></td>
                        <td>{ev.start_date || '—'}</td>
                        <td>
                          <button
                            className={`badge ${statusOf(ev)}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            title="Click to change status"
                            onClick={() => cycleStatus(ev)}
                          >
                            {STATUS_LABEL[statusOf(ev)]}
                          </button>
                        </td>
                        <td>{ev.venue_name || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn ghost small" onClick={() => edit(ev)}>Edit</button>{' '}
                          <button className="btn ghost small" onClick={() => remove(ev.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
