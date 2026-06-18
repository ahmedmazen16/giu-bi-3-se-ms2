// src/pages/Tasks.jsx — organizers assign tasks; staff update their own progress.
// Two views: a sortable table and a drag-and-drop Kanban board.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, FieldError } from '../validation.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s.replace('_', ' ')}</span>;
const NEXT = { pending: 'in_progress', in_progress: 'done', done: 'pending' };
const COLUMNS = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function Tasks() {
  const { user } = useAuth();
  const toast = useToast();
  const isOrganizer = user.role === 'organizer';
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState('table'); // 'table' | 'board'
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ event_id: '', title: '', description: '', assignee_id: '', due_date: '' });
  const [errors, setErrors] = useState({});

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    api.get(`/tasks?${p.toString()}`)
      .then(setTasks)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => {
    if (isOrganizer) {
      api.get('/events').then(setEvents).catch(() => {});
      api.get('/users?role=staff').then(setStaff).catch(() => {});
    }
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    const errs = runValidation(form, {
      event_id: (v) => isBlank(v) && 'Please choose an event',
      title: (v) => isBlank(v) && 'A task title is required',
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/tasks', { ...form, assignee_id: form.assignee_id || null });
      toast.success('Task assigned.');
      setForm({ event_id: '', title: '', description: '', assignee_id: '', due_date: '' });
      load();
    } catch (e2) { toast.error(e2.message); }
  }

  async function setStatus(t, status) {
    if (t.status === status) return;
    // Optimistic update so the board feels instant.
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
    try { await api.patch(`/tasks/${t.id}`, { status }); load(); }
    catch (e) { toast.error(e.message); load(); }
  }
  const cycle = (t) => setStatus(t, NEXT[t.status]);

  const { sorted, sort, toggle } = useSort(tasks, 'title');

  return (
    <>
      <div className="topbar">
        <h1>{isOrganizer ? 'Tasks' : 'My tasks'}</h1>
        <p>{isOrganizer ? 'Assign work to your team and track progress.' : 'Update the status of work assigned to you.'}</p>
      </div>
      <div className="content">
        {isOrganizer && (
          <div className="card" style={{ marginBottom: 22 }}>
            <h3>Assign a task</h3>
            <form onSubmit={create} style={{ marginTop: 12 }} noValidate>
              <div className="row">
                <div className="field"><label>Event</label>
                  <select className={errors.event_id ? 'invalid' : ''} value={form.event_id} onChange={set('event_id')}>
                    <option value="">— select —</option>
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                  <FieldError msg={errors.event_id} />
                </div>
                <div className="field"><label>Assign to</label>
                  <select value={form.assignee_id} onChange={set('assignee_id')}>
                    <option value="">— unassigned —</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.speciality})</option>)}
                  </select>
                </div>
                <div className="field"><label>Due date</label><input type="date" value={form.due_date} onChange={set('due_date')} /></div>
              </div>
              <div className="field"><label>Title</label>
                <input className={errors.title ? 'invalid' : ''} value={form.title} onChange={set('title')} />
                <FieldError msg={errors.title} />
              </div>
              <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
              <button className="btn">Assign task</button>
            </form>
          </div>
        )}

        <div className="section-title">
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <div className="field"><label>Filter by status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="view-toggle">
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
            <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Board</button>
          </div>
        </div>

        {loading ? <Spinner label="Loading tasks…" /> : tasks.length === 0 ? (
          <div className="card"><EmptyState variant="tasks" title="No tasks here" hint={isOrganizer ? 'Assign your first task above.' : 'Nothing assigned to you yet.'} /></div>
        ) : view === 'board' ? (
          <KanbanBoard tasks={tasks} columns={COLUMNS} isOrganizer={isOrganizer} onMove={setStatus} />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <SortTh label="Task" sortKey="title" sort={sort} toggle={toggle} />
                  <SortTh label="Event" sortKey="event_name" sort={sort} toggle={toggle} />
                  {isOrganizer && <SortTh label="Assignee" sortKey="assignee_name" sort={sort} toggle={toggle} />}
                  <SortTh label="Due" sortKey="due_date" sort={sort} toggle={toggle} />
                  <SortTh label="Status" sortKey="status" sort={sort} toggle={toggle} />
                  <th>Action</th>
                </tr></thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t.id}>
                      <td><b>{t.title}</b>{t.description && <><br /><span className="muted">{t.description}</span></>}</td>
                      <td>{t.event_name}</td>
                      {isOrganizer && <td>{t.assignee_name || <span className="muted">unassigned</span>}</td>}
                      <td>{t.due_date || '—'}</td>
                      <td><Badge s={t.status} /></td>
                      <td>
                        <button className="btn ghost small" onClick={() => cycle(t)}>
                          Mark {NEXT[t.status].replace('_', ' ')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Kanban board with HTML5 drag-and-drop ---------------- */
function KanbanBoard({ tasks, columns, isOrganizer, onMove }) {
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  function onDrop(colKey) {
    const t = tasks.find((x) => x.id === dragId);
    if (t) onMove(t, colKey);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div className="kanban">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            className={`kanban-col${overCol === col.key ? ' drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setOverCol(null); }}
            onDrop={() => onDrop(col.key)}
          >
            <div className="kanban-col-head">
              <h4>{col.label}</h4>
              <span className="kanban-count">{colTasks.length}</span>
            </div>
            {colTasks.map((t) => (
              <div
                key={t.id}
                className={`kanban-card${dragId === t.id ? ' dragging' : ''}`}
                draggable
                onDragStart={() => setDragId(t.id)}
                onDragEnd={() => { setDragId(null); setOverCol(null); }}
              >
                <h5>{t.title}</h5>
                {t.description && <div className="k-desc">{t.description}</div>}
                <div className="k-meta">
                  <span>✦ {t.event_name}</span>
                  {isOrganizer && <span>☺ {t.assignee_name || 'unassigned'}</span>}
                  {t.due_date && <span>◷ {t.due_date}</span>}
                </div>
              </div>
            ))}
            {colTasks.length === 0 && <div className="kanban-empty">Drop tasks here</div>}
          </div>
        );
      })}
    </div>
  );
}
