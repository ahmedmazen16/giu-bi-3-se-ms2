// src/pages/Sourcing.jsx — organizers send sourcing requests; vendors accept/decline + update delivery.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, FieldError } from '../validation.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s.replace(/_/g, ' ')}</span>;
const DELIVERY_FLOW = ['accepted', 'preparing', 'out_for_delivery', 'delivered'];

export default function Sourcing() {
  const { user } = useAuth();
  const toast = useToast();
  const isVendor = user.role === 'vendor';
  const isStaff = user.role === 'staff';
  const [rows, setRows] = useState([]);
  const [events, setEvents] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ event_id: '', vendor_id: '', items: '', quantity: '', delivery_date: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/sourcing').then(setRows).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!isVendor) {
      api.get('/events').then(setEvents).catch(() => {});
      api.get('/users?role=vendor').then(setVendors).catch(() => {});
    }
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function create(e) {
    e.preventDefault();
    const errs = runValidation(form, {
      event_id: (v) => isBlank(v) && 'Choose an event',
      vendor_id: (v) => isBlank(v) && 'Choose a vendor',
      items: (v) => isBlank(v) && 'Describe the items requested',
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/sourcing', { ...form, quantity: Number(form.quantity) || null });
      toast.success('Sourcing request sent.');
      setForm({ event_id: '', vendor_id: '', items: '', quantity: '', delivery_date: '' });
      load();
    } catch (e2) { toast.error(e2.message); }
  }

  async function vendorUpdate(id, status) {
    let note;
    if (status === 'declined') note = prompt('Reason / note for organizer (optional):') || null;
    try { await api.patch(`/sourcing/${id}`, { status, note }); toast.success(`Marked ${status.replace(/_/g, ' ')}.`); load(); }
    catch (e) { toast.error(e.message); }
  }

  const decorated = rows.map((s) => ({ ...s, party: isVendor ? s.organizer_name : (s.vendor_company || s.vendor_name) }));
  const { sorted, sort, toggle } = useSort(decorated, 'event_name');

  return (
    <>
      <div className="topbar">
        <h1>{isVendor ? 'Sourcing requests' : isStaff ? 'Vendor arrivals' : 'Sourcing'}</h1>
        <p>{isVendor ? 'Respond to organizers and keep delivery status up to date.'
            : isStaff ? 'Vendors supplying your events — mark them as arrived when they deliver.'
            : 'Request supplies from vendors and track delivery.'}</p>
      </div>
      <div className="content">
        {!isVendor && !isStaff && (
          <div className="card" style={{ marginBottom: 22 }}>
            <h3>New sourcing request</h3>
            <form onSubmit={create} style={{ marginTop: 12 }} noValidate>
              <div className="row">
                <div className="field"><label>Event</label>
                  <select className={errors.event_id ? 'invalid' : ''} value={form.event_id} onChange={set('event_id')}>
                    <option value="">— select —</option>
                    {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                  <FieldError msg={errors.event_id} />
                </div>
                <div className="field"><label>Vendor</label>
                  <select className={errors.vendor_id ? 'invalid' : ''} value={form.vendor_id} onChange={set('vendor_id')}>
                    <option value="">— select —</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.company || v.name}</option>)}
                  </select>
                  <FieldError msg={errors.vendor_id} />
                </div>
              </div>
              <div className="row">
                <div className="field"><label>Items requested</label>
                  <input className={errors.items ? 'invalid' : ''} value={form.items} onChange={set('items')} placeholder="e.g. Arabica beans 5kg" />
                  <FieldError msg={errors.items} />
                </div>
                <div className="field"><label>Quantity</label><input type="number" value={form.quantity} onChange={set('quantity')} /></div>
                <div className="field"><label>Delivery date</label><input type="date" value={form.delivery_date} onChange={set('delivery_date')} /></div>
              </div>
              <button className="btn">Send request</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3>{isVendor ? 'Incoming requests' : isStaff ? 'Deliveries for my events' : 'Sent requests'}</h3>
          {loading ? <Spinner label="Loading requests…" /> : rows.length === 0 ? (
            <EmptyState variant="sourcing" title="No requests yet" hint={isVendor ? 'Organizer requests will show up here.' : undefined} />
          ) : (
            <div className="table-wrap">
              <table style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <SortTh label="Items" sortKey="items" sort={sort} toggle={toggle} />
                    <SortTh label="Event" sortKey="event_name" sort={sort} toggle={toggle} />
                    <SortTh label={isVendor ? 'From' : 'Vendor'} sortKey="party" sort={sort} toggle={toggle} />
                    <SortTh label="Qty" sortKey="quantity" sort={sort} toggle={toggle} />
                    <SortTh label="Delivery" sortKey="delivery_date" sort={sort} toggle={toggle} />
                    <SortTh label="Status" sortKey="status" sort={sort} toggle={toggle} />
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.items}</b>{s.note && <><br /><span className="muted">Note: {s.note}</span></>}</td>
                      <td>{s.event_name}</td>
                      <td>{s.party}</td>
                      <td>{s.quantity || '—'}</td>
                      <td>{s.delivery_date || '—'}</td>
                      <td><Badge s={s.status} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isVendor ? (
                          s.status === 'pending' ? (
                            <>
                              <button className="btn sage small" onClick={() => vendorUpdate(s.id, 'accepted')}>Accept</button>{' '}
                              <button className="btn ghost small" onClick={() => vendorUpdate(s.id, 'declined')}>Decline</button>
                            </>
                          ) : s.status === 'declined' ? <span className="muted">declined</span> : (
                            (() => {
                              const next = DELIVERY_FLOW[DELIVERY_FLOW.indexOf(s.status) + 1];
                              return next
                                ? <button className="btn ghost small" onClick={() => vendorUpdate(s.id, next)}>Mark {next.replace(/_/g, ' ')}</button>
                                : <span className="muted">✓ delivered</span>;
                            })()
                          )
                        ) : isStaff ? (
                          s.status === 'delivered' ? <span className="badge delivered">✓ arrived</span>
                          : ['accepted', 'preparing', 'out_for_delivery'].includes(s.status)
                            ? <button className="btn sage small" onClick={() => vendorUpdate(s.id, 'delivered')}>Mark arrived</button>
                            : <span className="muted">—</span>
                        ) : <span className="muted">—</span>}
                      </td>
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
