# PopEyez — Pop-Up Café Event Management Platform

PopEyez is a full-stack web application that helps people run pop-up café events
from start to finish: finding and booking a venue, planning the event, assigning
work to staff, sourcing supplies from vendors, inviting guests, coordinating the
day itself, and reviewing how it went afterwards.

It implements the five user journeys from the Milestone 2 brief — **Event
Organizer, Team Member / Staff, Vendor / Supplier, Guest, and Venue Owner** —
each with its own role-based dashboard and navigation.

- **Frontend:** React (Vite) + React Router
- **Backend:** Node.js + Express
- **Database:** SQLite via `sql.js` (pure JavaScript — no native build step), with a seed script
- **Auth:** JWT-based login/registration with role-based access control

---

## Team — GIU BI 3

| Member | ID | Main contribution |
|---|---|---|
| Kareem Tamer | 22001375 | Backend setup, database schema, auth & events API |
| Malak El Koumy | 22001380 | Venues, bookings, vendors & sourcing modules |
| Ahmed Mazen | 22001360 | Tasks, budget & reporting features |
| Matthew Ghaly | 22001383 | Guests, invitations, RSVP & day-of communications |
| Abdelrahman Saro | 19002290 | Frontend architecture, routing, auth context & UI/styling |

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite 5 | Pages, routing, forms, role-based UI |
| Routing | React Router 6 | Protected routes per role |
| Backend | Node.js + Express 4 | REST API, validation, business logic |
| Database | SQLite (`sql.js`) | Pure-JS engine — installs with plain `npm install`, no compilers |
| Auth | `jsonwebtoken` + `bcryptjs` | 7-day JWT tokens, hashed passwords |

> **Why `sql.js`?** It is a real SQLite engine compiled to WebAssembly, so the
> schema, constraints and SQL are genuine — but it needs **no native build
> tools**, so `npm install` works the same on every machine. The database is
> stored in `backend/popeyez.db` and is written on every change.

---

## Project structure

```
popeyez/
  backend/
    routes/        # one file per resource (auth, venues, events, tasks, …)
    middleware/    # JWT auth + role guards
    db.js          # SQLite connection + schema
    seed.js        # drops, recreates and fills the database with dummy data
    server.js      # Express entry point
  frontend/
    src/
      pages/       # one component per screen
      components/  # shared layout / navigation
      context/     # auth context
      api.js       # fetch wrapper that attaches the JWT
    vite.config.js # dev server + /api proxy to the backend
  docs/
    ai-chatlog.md
    assumptions.md
  README.md
```

---

## Setup & running

You need **Node.js 18 or newer**. Open **two terminals**.

### 1. Backend (terminal 1)

```bash
cd backend
npm install
npm run seed     # creates backend/popeyez.db and fills it with dummy data
npm start        # API runs on http://localhost:4000
```

### 2. Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev      # app runs on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

The frontend dev server proxies every `/api/...` request to the backend on port
4000, so no extra configuration or CORS setup is required.

---

## Database & dummy data

- The database is a single SQLite file at `backend/popeyez.db`.
- Running `npm run seed` **drops and recreates all tables** and inserts a full
  set of realistic dummy data (users for every role, venues, bookings, events,
  tasks, budgets, sourcing requests, invoices, guests, a day-of message, and
  feedback).
- To reset the database to a clean demo state at any time, just run
  `npm run seed` again.

### Demo accounts

All demo accounts use the password **`password123`**:

| Role | Email |
|---|---|
| Event Organizer | `organizer@popeyez.com` |
| Team Member / Staff | `staff1@popeyez.com` |
| Vendor / Supplier | `vendor1@popeyez.com` |
| Venue Owner | `owner1@popeyez.com` |
| Guest | `guest1@popeyez.com` |

(The login screen also lets you tap a demo account to fill it in, and new
Vendors / Guests / Venue Owners can self-register.)

---

## Environment variables

None are required to run the project. The backend has one optional variable:

| Variable | Default | Purpose |
|---|---|---|
| `JWT_SECRET` | a built-in dev secret | Secret used to sign JWT tokens |
| `PORT` | `4000` | Backend port |

---

## Implemented user journeys

**Event Organizer**
- Create / update own account; create stakeholder accounts; deactivate accounts
- Browse & filter venues (city, capacity, keyword); apply to book; track request status
- Dashboard with key stats and **reminders of tasks due soon**
- Create & manage events; **filter the events list by date**
- Assign tasks to staff and filter tasks by status
- Budget management — planned vs actual with live variance
- Vendor directory with search; create sourcing requests; track delivery status; review invoices
- Guest list with search/filter (RSVP, dietary); send invitations; view RSVPs & dietary needs
- Day-of communications with seen counts, plus **follow-up messages sent only to guests who have not seen the original**
- Post-event feedback review and exportable event reports (costs, attendance, outcomes)

**Team Member / Staff**
- Log in with provided credentials
- **My Events — the events they participate in, filterable by date**
- View only their own assigned tasks; filter by status; update progress
- Guest check-in on event day (with arrival counts)
- **Vendor arrivals — see deliveries for their events and mark vendors as arrived**

**Vendor / Supplier**
- Register / log in; **view and edit vendor profile** (company, supplies, location, pricing, phone)
- Receive sourcing requests; accept or decline; add a note
- Update delivery status (Preparing → Out for Delivery → Delivered)
- Submit invoices and track their status (Pending Review → Approved → Paid)

**Guest**
- Self-register / log in
- **My Invitations — view invitations with full event details (date, venue, theme)**
- **RSVP (Attending / Maybe / Not Attending) with dietary preferences, updatable any time**
- **Receive day-of messages, see their status, and mark them as seen**
- Submit post-event feedback (overall, food, venue, organization + comments)

**Venue Owner**
- Register / log in
- Create, edit and remove venue listings
- Approve or decline organizer booking requests with an optional message
- **Performance dashboard — booking requests, approvals, booking rate and revenue per listing**

---

## Assumptions

See [`docs/assumptions.md`](docs/assumptions.md) for the full list. In short, a
few journey items that imply heavy external integrations (drag-and-drop floor
plan designer, real email/QR delivery, push notifications) are represented in a
simplified, in-app way so the core flows are fully functional and demonstrable.

---

## AI usage

AI tools were used during development to scaffold and review code, as permitted
by the brief. See [`docs/ai-chatlog.md`](docs/ai-chatlog.md) for details.
