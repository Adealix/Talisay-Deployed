import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

// Routes
import authRoutes from './routes/authRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import forumRoutes from './routes/forumRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'talisay-oil-server' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/forum', forumRoutes);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI;

async function start() {
  if (!mongoUri) {
    console.error('Missing MONGODB_URI. Create server/.env and set MONGODB_URI=...');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET. Create server/.env and set JWT_SECRET=...');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API running on http://0.0.0.0:${port}`);
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(
        `Port ${port} is already in use. Set PORT in server/.env (example: PORT=3001) and restart.`
      );
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });
}

start().catch((e) => {
  console.error('Failed to start server:', e);
  process.exit(1);
});
