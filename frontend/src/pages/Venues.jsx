// src/pages/Venues.jsx — organizers browse/search/book; venue owners manage listings.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, isPositiveNum, FieldError } from '../validation.jsx';

export default function Venues() {
  const { user } = useAuth();
  return user.role === 'venue_owner' ? <OwnerVenues /> : <BrowseVenues />;
}

/* ---------------- Organizer: browse, filter, apply to book ---------------- */
function BrowseVenues() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [filters, setFilters] = useState({ city: '', minCapacity: '', q: '' });
  const [booking, setBooking] = useState(null); // venue being booked
  const [bForm, setBForm] = useState({ event_date: '', attendees: '', notes: '' });
  const [bErrors, setBErrors] = useState({});
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (filters.city) p.set('city', filters.city);
    if (filters.minCapacity) p.set('minCapacity', filters.minCapacity);
    if (filters.q) p.set('q', filters.q);
    api.get(`/venues?${p.toString()}`).then(setVenues).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function applyBooking(e) {
    e.preventDefault();
    const errs = runValidation(bForm, {
      event_date: (v) => isBlank(v) && 'Please choose an event date',
    });
    setBErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/bookings', { venue_id: booking.id, ...bForm, attendees: Number(bForm.attendees) || null });
      toast.success(`Booking request sent for ${booking.name}.`);
      setBooking(null); setBForm({ event_date: '', attendees: '', notes: '' }); setBErrors({});
    } catch (e2) { toast.error(e2.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Find a venue</h1><p>Browse pop-up spaces and apply to book.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field"><label>City</label><input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} placeholder="Cairo" /></div>
          <div className="field"><label>Min capacity</label><input type="number" value={filters.minCapacity} onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })} placeholder="50" /></div>
          <div className="field"><label>Search</label><input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="name / keyword" /></div>
          <button className="btn" onClick={load}>Search</button>
        </div>

        {loading ? <Spinner label="Loading venues…" /> : (
          <div className="grid cols-3">
            {venues.map((v) => (
              <div className="card" key={v.id}>
                <h3>{v.name}</h3>
                <div className="muted" style={{ marginBottom: 8 }}>{v.location} · {v.city}</div>
                <p style={{ fontSize: 14, minHeight: 40 }}>{v.description}</p>
                <div style={{ margin: '8px 0' }}>
                  <span className="tag">★ {v.capacity} guests</span>
                  {v.size_sqm && <span className="tag">{v.size_sqm} m²</span>}
                  <span className="tag">{v.price_per_day} EGP/day</span>
                </div>
                {v.amenities && <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>{v.amenities}</div>}
                <button className="btn small" onClick={() => { setBooking(v); setBErrors({}); }}>Apply to book</button>
              </div>
            ))}
            {venues.length === 0 && <EmptyState variant="venues" title="No venues match your filters" hint="Try widening your search." />}
          </div>
        )}

        {booking && (
          <div className="card" style={{ marginTop: 22, maxWidth: 520 }}>
            <h3>Book “{booking.name}”</h3>
            <form onSubmit={applyBooking} style={{ marginTop: 12 }} noValidate>
              <div className="row">
                <div className="field"><label>Event date</label>
                  <input type="date" className={bErrors.event_date ? 'invalid' : ''} value={bForm.event_date} onChange={(e) => setBForm({ ...bForm, event_date: e.target.value })} />
                  <FieldError msg={bErrors.event_date} />
                </div>
                <div className="field"><label>Expected attendees</label><input type="number" value={bForm.attendees} onChange={(e) => setBForm({ ...bForm, attendees: e.target.value })} /></div>
              </div>
              <div className="field"><label>Notes for the owner</label><textarea value={bForm.notes} onChange={(e) => setBForm({ ...bForm, notes: e.target.value })} /></div>
              <button className="btn">Send request</button>
              <button type="button" className="btn ghost" style={{ marginLeft: 8 }} onClick={() => setBooking(null)}>Cancel</button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Venue owner: create / edit / remove listings ------------- */
const blankV = { name: '', description: '', location: '', city: '', capacity: '', size_sqm: '', amenities: '', price_per_day: '' };

function OwnerVenues() {
  const toast = useToast();
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(blankV);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/venues?mine=1').then(setVenues).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function validate() {
    return runValidation(form, {
      name: (v) => isBlank(v) && 'Name is required',
      location: (v) => isBlank(v) && 'Location is required',
      city: (v) => isBlank(v) && 'City is required',
      capacity: (v) => (isBlank(v) ? 'Capacity is required' : !isPositiveNum(v) && 'Enter a valid capacity'),
      price_per_day: (v) => (isBlank(v) ? 'Price is required' : !isPositiveNum(v) && 'Enter a valid price'),
    });
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const payload = { ...form, capacity: Number(form.capacity), size_sqm: Number(form.size_sqm) || null, price_per_day: Number(form.price_per_day) };
      if (editId) { await api.put(`/venues/${editId}`, payload); toast.success('Listing updated.'); }
      else { await api.post('/venues', payload); toast.success('Listing created.'); }
      setForm(blankV); setEditId(null); setErrors({}); load();
    } catch (e2) { toast.error(e2.message); }
  }
  function edit(v) { setEditId(v.id); setErrors({}); setForm({ ...blankV, ...v }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function remove(id) {
    if (!confirm('Remove this listing?')) return;
    try { await api.del(`/venues/${id}`); toast.success('Listing removed.'); load(); }
    catch (e) { toast.error(e.message); }
  }

  const { sorted, sort, toggle } = useSort(venues, 'name');

  return (
    <>
      <div className="topbar"><h1>My venues</h1><p>List your spaces and keep their details up to date.</p></div>
      <div className="content">
        <div className="grid cols-2">
          <div className="card">
            <h3>{editId ? 'Edit listing' : 'Add a venue listing'}</h3>
            <form onSubmit={submit} style={{ marginTop: 12 }} noValidate>
              <div className="field"><label>Name</label>
                <input className={errors.name ? 'invalid' : ''} value={form.name} onChange={set('name')} />
                <FieldError msg={errors.name} />
              </div>
              <div className="row">
                <div className="field"><label>Location</label>
                  <input className={errors.location ? 'invalid' : ''} value={form.location} onChange={set('location')} />
                  <FieldError msg={errors.location} />
                </div>
                <div className="field"><label>City</label>
                  <input className={errors.city ? 'invalid' : ''} value={form.city} onChange={set('city')} />
                  <FieldError msg={errors.city} />
                </div>
              </div>
              <div className="row">
                <div className="field"><label>Capacity</label>
                  <input type="number" className={errors.capacity ? 'invalid' : ''} value={form.capacity} onChange={set('capacity')} />
                  <FieldError msg={errors.capacity} />
                </div>
                <div className="field"><label>Size (m²)</label><input type="number" value={form.size_sqm} onChange={set('size_sqm')} /></div>
                <div className="field"><label>Price/day (EGP)</label>
                  <input type="number" className={errors.price_per_day ? 'invalid' : ''} value={form.price_per_day} onChange={set('price_per_day')} />
                  <FieldError msg={errors.price_per_day} />
                </div>
              </div>
              <div className="field"><label>Amenities</label><input value={form.amenities} onChange={set('amenities')} placeholder="WiFi, Kitchen, Parking" /></div>
              <div className="field"><label>Description</label><textarea value={form.description} onChange={set('description')} /></div>
              <button className="btn">{editId ? 'Save' : 'Add listing'}</button>
              {editId && <button type="button" className="btn ghost" style={{ marginLeft: 8 }} onClick={() => { setForm(blankV); setEditId(null); setErrors({}); }}>Cancel</button>}
            </form>
          </div>
          <div className="card">
            <h3>Listings ({venues.length})</h3>
            {loading ? <Spinner label="Loading listings…" /> : venues.length === 0 ? (
              <EmptyState variant="venues" title="No listings yet" hint="Add your first space on the left." />
            ) : (
              <div className="table-wrap">
                <table style={{ marginTop: 10 }}>
                  <thead><tr>
                    <SortTh label="Venue" sortKey="name" sort={sort} toggle={toggle} />
                    <SortTh label="City" sortKey="city" sort={sort} toggle={toggle} />
                    <SortTh label="Cap." sortKey="capacity" sort={sort} toggle={toggle} />
                    <SortTh label="Price" sortKey="price_per_day" sort={sort} toggle={toggle} />
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {sorted.map((v) => (
                      <tr key={v.id}>
                        <td><b>{v.name}</b></td><td>{v.city}</td><td>{v.capacity}</td><td>{v.price_per_day}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn ghost small" onClick={() => edit(v)}>Edit</button>{' '}
                          <button className="btn ghost small" onClick={() => remove(v.id)}>✕</button>
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
