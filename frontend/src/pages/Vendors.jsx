// src/pages/Vendors.jsx — organizer browses the vendor directory with live search.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function Vendors() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch the full directory once; filtering happens live in the browser.
  useEffect(() => {
    setLoading(true);
    api.get('/users?role=vendor')
      .then(setVendors)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter((v) =>
      [v.company, v.name, v.email, v.location, v.supplies, v.pricing]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term))
    );
  }, [vendors, q]);

  return (
    <>
      <div className="topbar"><h1>Vendors</h1><p>Browse suppliers and their offerings.</p></div>
      <div className="content">
        <div className="toolbar">
          <div className="field" style={{ flex: 1, minWidth: 240 }}>
            <label>Search vendors</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name, supplies, location…" />
          </div>
          {q && <button className="btn ghost" onClick={() => setQ('')}>Clear</button>}
        </div>

        {loading ? <Spinner label="Loading vendors…" /> : (
          <>
            {vendors.length > 0 && (
              <div className="muted" style={{ marginBottom: 12 }}>
                Showing {filtered.length} of {vendors.length} vendor{vendors.length === 1 ? '' : 's'}
              </div>
            )}
            <div className="grid cols-3">
              {filtered.map((v) => (
                <div className="card" key={v.id}>
                  <h3>{v.company || v.name}</h3>
                  <div className="muted" style={{ marginBottom: 8 }}>{v.name} · {v.location || '—'}</div>
                  {v.supplies && <p style={{ fontSize: 14 }}>{v.supplies}</p>}
                  <div style={{ marginTop: 8 }}>
                    {v.pricing && <span className="tag">{v.pricing}</span>}
                    {v.phone && <span className="tag">{v.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <EmptyState
                variant="vendors"
                title={q ? 'No vendors match your search' : 'No vendors found'}
                hint={q ? 'Try a different keyword.' : undefined}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
