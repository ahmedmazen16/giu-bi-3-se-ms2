// seed.js — drops and recreates all tables, then inserts realistic dummy data.
// Run with:  npm run seed
import bcrypt from 'bcryptjs';
import db, { initSchema } from './db.js';

console.log('Resetting database…');

// Drop everything (children first to respect foreign keys)
db.exec(`
  DROP TABLE IF EXISTS comm_receipts;
  DROP TABLE IF EXISTS communications;
  DROP TABLE IF EXISTS feedback;
  DROP TABLE IF EXISTS invoices;
  DROP TABLE IF EXISTS sourcing_requests;
  DROP TABLE IF EXISTS budget_items;
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS guests;
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS venues;
  DROP TABLE IF EXISTS users;
`);
initSchema();

const pw = (p) => bcrypt.hashSync(p, 10);

// ----- Users ----------------------------------------------------------------
const insUser = db.prepare(`
  INSERT INTO users (name, email, password, role, age, speciality, employment, company, supplies, location, pricing, phone)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);
const u = (o) => insUser.run(
  o.name, o.email, o.password, o.role,
  o.age ?? null, o.speciality ?? null, o.employment ?? null,
  o.company ?? null, o.supplies ?? null, o.location ?? null, o.pricing ?? null, o.phone ?? null
).lastInsertRowid;

// Organizer (main demo login)
const organizer = u({ name:'Kareem Tamer', email:'organizer@popeyez.com', password:pw('password123'), role:'organizer' });
const organizer2 = u({ name:'Malak El Koumy', email:'malak@popeyez.com', password:pw('password123'), role:'organizer' });

// Staff
const staff1 = u({ name:'Ahmed Mazen',  email:'staff1@popeyez.com', password:pw('password123'), role:'staff', age:24, speciality:'Catering',  employment:'full-time' });
const staff2 = u({ name:'Matthew Ghaly', email:'staff2@popeyez.com', password:pw('password123'), role:'staff', age:22, speciality:'Seating',   employment:'part-time' });
const staff3 = u({ name:'Abdelrahman Saro', email:'staff3@popeyez.com', password:pw('password123'), role:'staff', age:26, speciality:'Logistics', employment:'full-time' });

// Vendors
const vendor1 = u({ name:'Sara Hassan', email:'vendor1@popeyez.com', password:pw('password123'), role:'vendor', company:'BeanThere Coffee Co.', supplies:'Coffee beans, espresso machines, cups', location:'Cairo', pricing:'From 500 EGP', phone:'+20 100 111 2222' });
const vendor2 = u({ name:'Omar Khaled', email:'vendor2@popeyez.com', password:pw('password123'), role:'vendor', company:'FreshBake Pastries', supplies:'Croissants, muffins, cakes', location:'Giza', pricing:'From 300 EGP', phone:'+20 100 333 4444' });
const vendor3 = u({ name:'Layla Adel',  email:'vendor3@popeyez.com', password:pw('password123'), role:'vendor', company:'EventGear Rentals', supplies:'Tables, chairs, tents, lighting', location:'Cairo', pricing:'From 1000 EGP', phone:'+20 100 555 6666' });

// Venue owners
const owner1 = u({ name:'Hany Fouad', email:'owner1@popeyez.com', password:pw('password123'), role:'venue_owner', company:'Downtown Spaces', phone:'+20 122 777 8888' });
const owner2 = u({ name:'Nadia Samir', email:'owner2@popeyez.com', password:pw('password123'), role:'venue_owner', company:'Zamalek Lofts', phone:'+20 122 999 0000' });

// Guests (also have logins so they can RSVP / give feedback)
const guestUser1 = u({ name:'Youssef Eldiary', email:'guest1@popeyez.com', password:pw('password123'), role:'guest' });
const guestUser2 = u({ name:'Mohamed Aamer',   email:'guest2@popeyez.com', password:pw('password123'), role:'guest' });

// ----- Venues ---------------------------------------------------------------
const insVenue = db.prepare(`
  INSERT INTO venues (owner_id, name, description, location, city, capacity, size_sqm, amenities, price_per_day, photo)
  VALUES (?,?,?,?,?,?,?,?,?,?)
`);
const v1 = insVenue.run(owner1, 'The Loft Downtown', 'Industrial-style open space with natural light, perfect for pop-ups.', 'Tahrir St, Downtown', 'Cairo', 80, 120, 'WiFi, Kitchen, Parking, Sound system', 2500, null).lastInsertRowid;
const v2 = insVenue.run(owner1, 'Garden Courtyard', 'Outdoor courtyard with greenery and shaded seating.', '12 Road 9, Maadi', 'Cairo', 120, 200, 'Garden, Restrooms, Power outlets', 3200, null).lastInsertRowid;
const v3 = insVenue.run(owner2, 'Zamalek Art House', 'Gallery space surrounded by local art, intimate setting.', '5 Brazil St, Zamalek', 'Cairo', 50, 90, 'WiFi, AC, Gallery lighting', 2000, null).lastInsertRowid;
const v4 = insVenue.run(owner2, 'Rooftop 360', 'Panoramic rooftop venue with city views.', 'Nile Tower, Giza', 'Giza', 100, 150, 'Bar, Sound system, Elevator', 4000, null).lastInsertRowid;

// ----- Bookings -------------------------------------------------------------
const insBooking = db.prepare('INSERT INTO bookings (venue_id, organizer_id, event_date, attendees, notes, status, owner_message) VALUES (?,?,?,?,?,?,?)');
insBooking.run(v1, organizer, '2026-07-05', 70, 'Weekend coffee pop-up', 'approved', 'Looking forward to hosting you!');
insBooking.run(v3, organizer, '2026-07-19', 45, 'Art + espresso evening', 'pending', null);
insBooking.run(v4, organizer2, '2026-08-02', 90, 'Sunset launch party', 'pending', null);

// ----- Events ---------------------------------------------------------------
const insEvent = db.prepare('INSERT INTO events (organizer_id, name, description, theme, venue_id, start_date, end_date, planned_budget, status) VALUES (?,?,?,?,?,?,?,?,?)');
const e1 = insEvent.run(organizer, 'Summer Brews Pop-Up', 'A weekend specialty coffee experience.', 'Minimalist / Scandinavian', v1, '2026-07-05', '2026-07-06', 15000, 'planning').lastInsertRowid;
const e2 = insEvent.run(organizer, 'Art & Espresso Night', 'Coffee tasting amongst local art.', 'Artsy / Bohemian', v3, '2026-07-19', '2026-07-19', 9000, 'planning').lastInsertRowid;

// ----- Tasks ----------------------------------------------------------------
const insTask = db.prepare('INSERT INTO tasks (event_id, title, description, assignee_id, due_date, status) VALUES (?,?,?,?,?,?)');
insTask.run(e1, 'Confirm coffee supplier order', 'Finalise bean quantities with BeanThere.', staff1, '2026-06-25', 'in_progress');
insTask.run(e1, 'Set up seating layout',        'Arrange 70 seats per floor plan.',        staff2, '2026-07-04', 'pending');
insTask.run(e1, 'Coordinate equipment delivery','Receive tables and lighting from EventGear.', staff3, '2026-07-04', 'pending');
insTask.run(e1, 'Brief check-in team',          'Train staff on QR check-in.',             staff2, '2026-07-05', 'pending');
insTask.run(e2, 'Curate art pieces',            'Liaise with gallery on displayed works.', staff3, '2026-07-15', 'done');
insTask.run(e2, 'Plan tasting menu',            'Select 4 coffee origins to feature.',     staff1, '2026-07-10', 'in_progress');

// ----- Budget ---------------------------------------------------------------
const insBudget = db.prepare('INSERT INTO budget_items (event_id, category, planned, actual) VALUES (?,?,?,?)');
insBudget.run(e1, 'Venue',     6000, 6000);
insBudget.run(e1, 'Catering',  4000, 3500);
insBudget.run(e1, 'Equipment', 2500, 2700);
insBudget.run(e1, 'Marketing', 1500, 900);
insBudget.run(e1, 'Staff',     1000, 1000);
insBudget.run(e2, 'Venue',     2000, 2000);
insBudget.run(e2, 'Catering',  3000, 0);
insBudget.run(e2, 'Marketing', 1000, 400);

// ----- Sourcing requests ----------------------------------------------------
const insSourcing = db.prepare('INSERT INTO sourcing_requests (event_id, vendor_id, organizer_id, items, quantity, delivery_date, status, note) VALUES (?,?,?,?,?,?,?,?)');
insSourcing.run(e1, vendor1, organizer, 'Arabica beans (5kg) + 3 espresso machines', 5, '2026-07-04', 'accepted', 'Confirmed, will deliver morning of.');
insSourcing.run(e1, vendor3, organizer, 'Tables (10) + ambient lighting set', 10, '2026-07-04', 'preparing', null);
insSourcing.run(e2, vendor2, organizer, 'Assorted pastries for 45 guests', 45, '2026-07-19', 'pending', null);

// ----- Invoices -------------------------------------------------------------
const insInvoice = db.prepare('INSERT INTO invoices (request_id, vendor_id, organizer_id, amount, details, status) VALUES (?,?,?,?,?,?)');
insInvoice.run(1, vendor1, organizer, 3500, 'Beans + machine rental', 'approved');
insInvoice.run(2, vendor3, organizer, 2700, 'Tables + lighting',       'pending_review');

// ----- Guests ---------------------------------------------------------------
const insGuest = db.prepare('INSERT INTO guests (event_id, name, email, rsvp_status, dietary, invited, checked_in) VALUES (?,?,?,?,?,?,?)');
insGuest.run(e1, 'Youssef Eldiary', 'guest1@popeyez.com', 'attending',     'Vegetarian', 1, 1);
insGuest.run(e1, 'Mohamed Aamer',   'guest2@popeyez.com', 'attending',     'None',       1, 0);
insGuest.run(e1, 'Farida Helmy',    'farida@example.com', 'maybe',         'Vegan',      1, 0);
insGuest.run(e1, 'Hager Khaled',    'hager@example.com',  'not_attending', 'None',       1, 0);
insGuest.run(e1, 'Yasmin Elbehiry', 'yasmin@example.com', 'pending',       null,         1, 0);
insGuest.run(e2, 'Mariam Tamer',    'mariam@example.com', 'attending',     'Gluten-free',1, 0);
insGuest.run(e2, 'Heba Hegazy',     'heba@example.com',   'pending',       null,         0, 0);

// ----- Communications + feedback -------------------------------------------
const insComm = db.prepare('INSERT INTO communications (event_id, message) VALUES (?,?)');
const c1 = insComm.run(e1, 'Welcome! Doors open at 10am. Parking is available on Tahrir St.').lastInsertRowid;
const insReceipt = db.prepare('INSERT INTO comm_receipts (comm_id, guest_id, seen) VALUES (?,?,?)');
db.prepare('SELECT id FROM guests WHERE event_id = ?').all(e1).forEach((g, i) => insReceipt.run(c1, g.id, i % 2));

const insFb = db.prepare('INSERT INTO feedback (event_id, guest_id, overall, food, venue, organization, comment) VALUES (?,?,?,?,?,?,?)');
insFb.run(e1, 1, 5, 5, 4, 5, 'Amazing coffee and atmosphere!');
insFb.run(e1, 2, 4, 4, 5, 4, 'Loved the venue, queue was a bit long.');

console.log('Seed complete.');
console.log('---------------------------------------------');
console.log('Demo logins (password for all: password123):');
console.log('  Organizer   : organizer@popeyez.com');
console.log('  Staff       : staff1@popeyez.com');
console.log('  Vendor      : vendor1@popeyez.com');
console.log('  Venue owner : owner1@popeyez.com');
console.log('  Guest       : guest1@popeyez.com');
console.log('---------------------------------------------');
