// src/pages/Budget.jsx — planned vs actual budget tracking per event.
// Budget lines can be drag-reordered; the order is remembered per-event in localStorage
// (the backend has no ordering column, so this stays a frontend-only nicety).
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { runValidation, isBlank, FieldError } from '../validation.jsx';

const ORDER_KEY = (eventId) => `popeyez_budget_order_${eventId}`;

function applyOrder(items, eventId) {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY(eventId)) || 'null');
    if (!Array.isArray(saved)) return items;
    const rank = new Map(saved.map((id, i) => [id, i]));
    return [...items].sort((a, b) => {
      const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
      const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
      return ra - rb;
    });
  } catch { return items; }
}

export default function Budget() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [data, setData] = useState({ items: [], totals: { planned: 0, actual: 0, variance: 0 } });
  const [orderedItems, setOrderedItems] = useState([]);
  const [form, setForm] = useState({ category: '', planned: '', actual: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => {
    api.get('/events')
      .then((evs) => { setEvents(evs); if (evs[0]) setEventId(String(evs[0].id)); else setLoading(false); })
      .catch((e) => { toast.error(e.message); setLoading(false); });
  }, []);

  function load() {
    if (!eventId) return;
    setLoading(true);
    api.get(`/budget/${eventId}`)
      .then((d) => { setData(d); setOrderedItems(applyOrder(d.items, eventId)); })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [eventId]);

  function persistOrder(items) {
    localStorage.setItem(ORDER_KEY(eventId), JSON.stringify(items.map((i) => i.id)));
  }

  async function addLine(e) {
    e.preventDefault();
    const errs = runValidation(form, {
      category: (v) => isBlank(v) && 'Category is required',
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/budget', { event_id: Number(eventId), category: form.category, planned: Number(form.planned) || 0, actual: Number(form.actual) || 0 });
      setForm({ category: '', planned: '', actual: '' });
      toast.success('Budget line added.');
      load();
    } catch (e2) { toast.error(e2.message); }
  }
  async function logActual(item) {
    const v = prompt(`Actual spend for "${item.category}":`, item.actual);
    if (v == null) return;
    if (Number.isNaN(Number(v))) { toast.error('Please enter a valid number.'); return; }
    try { await api.patch(`/budget/${item.id}`, { actual: Number(v) || 0 }); toast.success('Spend logged.'); load(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove(id) {
    if (!confirm('Delete line?')) return;
    try { await api.del(`/budget/${id}`); toast.success('Line deleted.'); load(); }
    catch (e) { toast.error(e.message); }
  }

  // Drag-to-reorder
  function onDrop(targetId) {
    if (dragId == null || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const arr = [...orderedItems];
    const from = arr.findIndex((i) => i.id === dragId);
    const to = arr.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setOrderedItems(arr);
    persistOrder(arr);
    setDragId(null);
    setOverId(null);
  }

  const totals = data.totals;
  const pct = totals.planned ? Math.min(100, Math.round((totals.actual / totals.planned) * 100)) : 0;

  return (
    <>
      <div className="topbar"><h1>Budget</h1><p>Compare your planned budget against actual spend.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>Event</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid cols-3" style={{ marginBottom: 22 }}>
          <div className="stat"><div className="label">Planned</div><div className="value">{totals.planned.toLocaleString()}</div><div className="hint">EGP</div></div>
          <div className="stat"><div className="label">Actual</div><div className="value">{totals.actual.toLocaleString()}</div><div className="hint">EGP spent</div></div>
          <div className="stat">
            <div className="label">Variance</div>
            <div className="value" style={{ color: totals.variance >= 0 ? 'var(--good)' : 'var(--bad)' }}>{totals.variance.toLocaleString()}</div>
            <div className="hint">{totals.variance >= 0 ? 'under budget' : 'over budget'}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 22 }}>
          <div className="muted" style={{ marginBottom: 6 }}>Spend vs plan — {pct}%</div>
          <div className="progress"><div style={{ width: `${pct}%`, background: pct > 100 ? 'var(--bad)' : 'var(--terracotta)' }} /></div>
        </div>

        <div className="grid cols-2">
          <div className="card">
            <h3>Budget lines</h3>
            {loading ? <Spinner label="Loading budget…" /> : orderedItems.length === 0 ? (
              <EmptyState variant="budget" title="No budget lines yet" hint="Add your first category on the right." />
            ) : (
              <>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Drag rows to reorder.</div>
                <div className="table-wrap">
                  <table style={{ marginTop: 8 }}>
                    <thead><tr><th></th><th>Category</th><th>Planned</th><th>Actual</th><th></th></tr></thead>
                    <tbody>
                      {orderedItems.map((i) => (
                        <tr
                          key={i.id}
                          className={`draggable-row${dragId === i.id ? ' dragging-row' : ''}${overId === i.id ? ' drag-over-row' : ''}`}
                          draggable
                          onDragStart={() => setDragId(i.id)}
                          onDragOver={(e) => { e.preventDefault(); setOverId(i.id); }}
                          onDragLeave={() => setOverId((o) => (o === i.id ? null : o))}
                          onDrop={() => onDrop(i.id)}
                          onDragEnd={() => { setDragId(null); setOverId(null); }}
                        >
                          <td className="drag-handle" title="Drag to reorder">⠿</td>
                          <td><b>{i.category}</b></td>
                          <td>{i.planned.toLocaleString()}</td>
                          <td>{i.actual.toLocaleString()}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button className="btn ghost small" onClick={() => logActual(i)}>Log spend</button>{' '}
                            <button className="btn ghost small" onClick={() => remove(i.id)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="card">
            <h3>Add a budget line</h3>
            <form onSubmit={addLine} style={{ marginTop: 12 }} noValidate>
              <div className="field"><label>Category</label>
                <input className={errors.category ? 'invalid' : ''} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Catering, Marketing…" />
                <FieldError msg={errors.category} />
              </div>
              <div className="row">
                <div className="field"><label>Planned (EGP)</label><input type="number" value={form.planned} onChange={(e) => setForm({ ...form, planned: e.target.value })} /></div>
                <div className="field"><label>Actual (EGP)</label><input type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} /></div>
              </div>
              <button className="btn">Add line</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
