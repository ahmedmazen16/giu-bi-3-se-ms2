// src/components/Spinner.jsx — loading indicator shown while data fetches.
export default function Spinner({ label = 'Loading…' }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <div className="spinner" />
      {label && <div className="spinner-label">{label}</div>}
    </div>
  );
}
