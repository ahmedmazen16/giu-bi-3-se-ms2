// server.js — Express application entry point
import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import venueRoutes from './routes/venues.js';
import bookingRoutes from './routes/bookings.js';
import eventRoutes from './routes/events.js';
import taskRoutes from './routes/tasks.js';
import budgetRoutes from './routes/budget.js';
import sourcingRoutes from './routes/sourcing.js';
import invoiceRoutes from './routes/invoices.js';
import guestRoutes from './routes/guests.js';
import miscRoutes from './routes/misc.js';

initSchema();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'PopEyez API' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/sourcing', sourcingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api', miscRoutes); // comms, feedback, reports, dashboard

// 404 + error handlers
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`PopEyez API running on http://localhost:${PORT}`));
