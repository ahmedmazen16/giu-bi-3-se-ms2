// db.js — SQLite database via sql.js (pure JS/WASM, no native build required).
// Exposes a small better-sqlite3-compatible API so route code stays clean:
//   db.prepare(sql).get(...args) | .all(...args) | .run(...args)
//   db.exec(sql)  | db.transaction(fn)  | db.pragma(...)
// Data persists to popeyez.db on every write.
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'popeyez.db');

const SQL = await initSqlJs();
const raw = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
raw.run('PRAGMA foreign_keys = ON');

function save() {
  fs.writeFileSync(dbPath, Buffer.from(raw.export()));
}

// Normalise varargs: support both .run(a, b, c) and .run([a, b, c])
function params(args) {
  return args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
}

const db = {
  prepare(sql) {
    return {
      get(...args) {
        const stmt = raw.prepare(sql);
        try {
          stmt.bind(params(args));
          return stmt.step() ? stmt.getAsObject() : undefined;
        } finally { stmt.free(); }
      },
      all(...args) {
        const stmt = raw.prepare(sql);
        const rows = [];
        try {
          stmt.bind(params(args));
          while (stmt.step()) rows.push(stmt.getAsObject());
        } finally { stmt.free(); }
        return rows;
      },
      run(...args) {
        raw.run(sql, params(args));
        const r = raw.exec('SELECT last_insert_rowid() AS id, changes() AS c');
        save();
        const [id, c] = r[0]?.values?.[0] ?? [0, 0];
        return { lastInsertRowid: id, changes: c };
      },
    };
  },
  exec(sql) { raw.run(sql); save(); },
  transaction(fn) { return (arg) => { const out = fn(arg); save(); return out; }; },
  pragma() { /* no-op: sql.js does not need WAL */ },
};

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password      TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK (role IN ('organizer','staff','vendor','guest','venue_owner')),
      active        INTEGER NOT NULL DEFAULT 1,
      age           INTEGER,
      speciality    TEXT,
      employment    TEXT,
      company       TEXT,
      supplies      TEXT,
      location      TEXT,
      pricing       TEXT,
      phone         TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS venues (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id      INTEGER NOT NULL REFERENCES users(id),
      name          TEXT    NOT NULL,
      description   TEXT,
      location      TEXT    NOT NULL,
      city          TEXT    NOT NULL,
      capacity      INTEGER NOT NULL,
      size_sqm      INTEGER,
      amenities     TEXT,
      price_per_day REAL    NOT NULL,
      photo         TEXT,
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id      INTEGER NOT NULL REFERENCES venues(id),
      organizer_id  INTEGER NOT NULL REFERENCES users(id),
      event_date    TEXT    NOT NULL,
      attendees     INTEGER,
      notes         TEXT,
      status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
      owner_message TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      organizer_id  INTEGER NOT NULL REFERENCES users(id),
      name          TEXT    NOT NULL,
      description   TEXT,
      theme         TEXT,
      venue_id      INTEGER REFERENCES venues(id),
      start_date    TEXT,
      end_date      TEXT,
      planned_budget REAL   DEFAULT 0,
      status        TEXT    NOT NULL DEFAULT 'planning',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      title         TEXT    NOT NULL,
      description   TEXT,
      assignee_id   INTEGER REFERENCES users(id),
      due_date      TEXT,
      status        TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budget_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      category      TEXT    NOT NULL,
      planned       REAL    NOT NULL DEFAULT 0,
      actual        REAL    NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sourcing_requests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      vendor_id     INTEGER NOT NULL REFERENCES users(id),
      organizer_id  INTEGER NOT NULL REFERENCES users(id),
      items         TEXT    NOT NULL,
      quantity      INTEGER,
      delivery_date TEXT,
      status        TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','declined','preparing','out_for_delivery','delivered')),
      note          TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id    INTEGER REFERENCES sourcing_requests(id),
      vendor_id     INTEGER NOT NULL REFERENCES users(id),
      organizer_id  INTEGER NOT NULL REFERENCES users(id),
      amount        REAL    NOT NULL,
      details       TEXT,
      status        TEXT    NOT NULL DEFAULT 'pending_review'
                    CHECK (status IN ('pending_review','approved','paid')),
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS guests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL,
      rsvp_status   TEXT    NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending','attending','not_attending','maybe')),
      dietary       TEXT,
      invited       INTEGER NOT NULL DEFAULT 0,
      checked_in    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS communications (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      message       TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS comm_receipts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      comm_id       INTEGER NOT NULL REFERENCES communications(id),
      guest_id      INTEGER NOT NULL REFERENCES guests(id),
      seen          INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id      INTEGER NOT NULL REFERENCES events(id),
      guest_id      INTEGER REFERENCES guests(id),
      overall       INTEGER,
      food          INTEGER,
      venue         INTEGER,
      organization  INTEGER,
      comment       TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export default db;
