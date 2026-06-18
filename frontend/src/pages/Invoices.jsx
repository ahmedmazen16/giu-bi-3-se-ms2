// src/pages/Invoices.jsx — vendors submit invoices; organizers review/approve/pay.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useSort, SortTh } from '../components/SortableTable.jsx';
import { runValidation, isBlank, isPositiveNum, FieldError } from '../validation.jsx';

const Badge = ({ s }) => <span className={`badge ${s}`}>{s.replace(/_/g, ' ')}</span>;

export default function Invoices() {
  const { user } = useAuth();
  const toast = useToast();
  const isVendor = user.role === 'vendor';
  const [rows, setRows] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [form, setForm] = useState({ organizer_id: '', amount: '', details: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/invoices').then(setRows).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (isVendor) api.get('/users?role=organizer').then(setOrganizers).catch(() => {}); }, []);

  async function submit(e) {
    e.preventDefault();
    const errs = runValidation(form, {
      organizer_id: (v) => isBlank(v) && 'Choose who to bill',
      amount: (v) => (isBlank(v) ? 'Amount is required' : !isPositiveNum(v) && 'Enter a valid amount'),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post('/invoices', { ...form, amount: Number(form.amount) });
      toast.success('Invoice submitted.');
      setForm({ organizer_id: '', amount: '', details: '' });
      load();
    } catch (e2) { toast.error(e2.message); }
  }
  async function review(id, status) {
    try { await api.patch(`/invoices/${id}`, { status }); toast.success(`Invoice ${status}.`); load(); }
    catch (e) { toast.error(e.message); }
  }

  // Sort with a couple of derived keys for the polymorphic "party" column.
  const decorated = rows.map((i) => ({ ...i, party: isVendor ? i.organizer_name : (i.vendor_company || i.vendor_name) }));
  const { sorted, sort, toggle } = useSort(decorated, 'party');

  return (
    <>
      <div className="topbar">
        <h1>Invoices</h1>
        <p>{isVendor ? 'Submit invoices and track their status.' : 'Review and approve vendor invoices.'}</p>
      </div>
      <div className="content">
        {isVendor && (
          <div className="card" style={{ marginBottom: 22 }}>
            <h3>Submit an invoice</h3>
            <form onSubmit={submit} style={{ marginTop: 12 }} noValidate>
              <div className="row">
                <div className="field"><label>Bill to (organizer)</label>
                  <select className={errors.organizer_id ? 'invalid' : ''} value={form.organizer_id} onChange={(e) => setForm({ ...form, organizer_id: e.target.value })}>
                    <option value="">— select —</option>
                    {organizers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <FieldError msg={errors.organizer_id} />
                </div>
                <div className="field"><label>Amount (EGP)</label>
                  <input type="number" className={errors.amount ? 'invalid' : ''} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  <FieldError msg={errors.amount} />
                </div>
              </div>
              <div className="field"><label>Itemized details</label><textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="What this invoice covers" /></div>
              <button className="btn">Submit invoice</button>
            </form>
          </div>
        )}

        <div className="card">
          <h3>{isVendor ? 'My invoices' : 'Received invoices'}</h3>
          {loading ? <Spinner label="Loading invoices…" /> : rows.length === 0 ? (
            <EmptyState variant="invoices" title="No invoices yet" hint={isVendor ? 'Submit your first invoice above.' : 'Vendor invoices will appear here.'} />
          ) : (
            <div className="table-wrap">
              <table style={{ marginTop: 10 }}>
                <thead><tr>
                  <SortTh label={isVendor ? 'To' : 'From'} sortKey="party" sort={sort} toggle={toggle} />
                  <SortTh label="Amount" sortKey="amount" sort={sort} toggle={toggle} />
                  <th>Details</th>
                  <SortTh label="Status" sortKey="status" sort={sort} toggle={toggle} />
                  {!isVendor && <th>Action</th>}
                </tr></thead>
                <tbody>
                  {sorted.map((i) => (
                    <tr key={i.id}>
                      <td><b>{i.party}</b></td>
                      <td>{i.amount.toLocaleString()} EGP</td>
                      <td className="muted">{i.details || '—'}</td>
                      <td><Badge s={i.status} /></td>
                      {!isVendor && (
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {i.status === 'pending_review' && <button className="btn sage small" onClick={() => review(i.id, 'approved')}>Approve</button>}
                          {i.status === 'approved' && <button className="btn small" onClick={() => review(i.id, 'paid')}>Mark paid</button>}
                          {i.status === 'paid' && <span className="muted">✓ paid</span>}
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
