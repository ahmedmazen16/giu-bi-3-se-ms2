// src/components/EmptyState.jsx — friendly SVG illustrations for empty tables/lists.
// All art uses currentColor so it adapts to light/dark themes automatically.

const Cup = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M28 38h54v22a20 20 0 0 1-20 20H48a20 20 0 0 1-20-20V38Z" />
    <path d="M82 44h10a12 12 0 0 1 0 24h-10" />
    <path d="M40 16c-4 5-4 9 0 14M56 12c-4 6-4 10 0 16M72 16c-4 5-4 9 0 14" opacity=".7" />
    <path d="M24 88h62" />
  </svg>
);

const Calendar = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="24" y="22" width="72" height="60" rx="8" />
    <path d="M24 40h72M40 14v14M80 14v14" />
    <path d="M40 56h10M58 56h10M40 68h10" opacity=".7" />
  </svg>
);

const Clipboard = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="30" y="18" width="60" height="68" rx="8" />
    <rect x="46" y="12" width="28" height="14" rx="5" />
    <path d="M44 44h32M44 58h32M44 72h20" opacity=".7" />
  </svg>
);

const Box = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M60 18 96 36v34L60 88 24 70V36L60 18Z" />
    <path d="M24 36l36 18 36-18M60 54v34" opacity=".7" />
  </svg>
);

const Envelope = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="20" y="26" width="80" height="56" rx="8" />
    <path d="M22 32 60 58 98 32" />
  </svg>
);

const People = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="48" cy="36" r="14" />
    <path d="M24 80c0-14 10-22 24-22s24 8 24 22" />
    <circle cx="84" cy="40" r="10" opacity=".7" />
    <path d="M78 80c0-10 4-16 14-16s14 6 14 16" opacity=".7" />
  </svg>
);

const Star = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M60 20 71 44l26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3 11-24Z" />
  </svg>
);

const Money = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="20" y="28" width="80" height="44" rx="8" />
    <circle cx="60" cy="50" r="12" />
    <path d="M36 40v20M84 40v20" opacity=".7" />
  </svg>
);

const Receipt = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M34 14h52v74l-9-6-8 6-9-6-8 6-9-6-9 6V14Z" />
    <path d="M46 34h28M46 48h28M46 62h18" opacity=".7" />
  </svg>
);

const Home = () => (
  <svg viewBox="0 0 120 96" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M28 50 60 22l32 28" />
    <path d="M36 46v34h48V46" />
    <path d="M52 80V60h16v20" opacity=".7" />
  </svg>
);

const ART = {
  default: Cup,
  cup: Cup,
  events: Calendar,
  calendar: Calendar,
  tasks: Clipboard,
  sourcing: Box,
  invitations: Envelope,
  bookings: Envelope,
  guests: People,
  feedback: Star,
  budget: Money,
  invoices: Receipt,
  venues: Home,
  vendors: Box,
};

export default function EmptyState({ variant = 'default', title = 'Nothing here yet', hint }) {
  const Art = ART[variant] || ART.default;
  return (
    <div className="empty">
      <div className="empty-art"><Art /></div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
