# AI Usage Log

As permitted by the project brief (Section 6, AI Usage Policy), AI tools were
used during development. This document summarises how AI was used. The full
prompt-and-answer chatlog is linked/attached below.

## How AI was used

- **Scaffolding the backend** — generating the Express server, route structure,
  and the SQLite schema based on the entities implied by the User Journeys
  document (users, venues, bookings, events, tasks, budget, sourcing, invoices,
  guests, communications, feedback).
- **Switching the database driver** — when `better-sqlite3` failed to compile in
  one environment, AI helped switch to the pure-JavaScript `sql.js` engine and
  write a small adapter so the rest of the code stayed the same.
- **Frontend scaffolding** — generating the React pages, routing with
  role-based guards, the auth context, the API fetch wrapper, and the CSS theme.
- **Debugging** — e.g. fixing an ambiguous SQL column (`status`) in a dashboard
  query that joined `tasks` and `events`.
- **Writing the seed script** with realistic dummy data for every role.

## Our responsibility

All generated code was reviewed, tested, and adapted by the team. We ran the
backend and frontend locally, verified the API endpoints, confirmed role-based
access control (e.g. staff only see their own tasks), and tested the main user
flows for each role before submission. Each team member is able to explain the
parts of the code they worked on.

## Full chatlog

> **Kareem:** paste the shareable link to the AI conversation here before
> submission (the same way the Milestone 1 chatlog link was provided), or export
> the conversation and save it in this `docs/` folder as `ai-chatlog.pdf`.

Link: _<add link here>_
