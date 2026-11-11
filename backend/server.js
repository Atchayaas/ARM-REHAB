import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDatabase } from './config/db.js';
import patientsRouter from './routes/patients.js';
import sessionsRouter from './routes/sessions.js';
import notesRouter from './routes/notes.js';
import painReportsRouter from './routes/painReports.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*', // Allow frontend Vite dev server (localhost:3000)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/notes', notesRouter);
app.use('/api/pain-reports', painReportsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'FlexRehab AI Express + MySQL Backend',
  });
});

// Start Server & Connect Database
async function startServer() {
  try {
    console.log('[Server] Connecting to MySQL database...');
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  FlexRehab AI Backend running on: http://localhost:${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Connected Database: MySQL (XAMPP localhost:3306)`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server Failed to Start]:', err.message);
    console.log('[Tip] Ensure XAMPP MySQL module is STARTED, then run: npm run server');
    // Start server anyway so frontend doesn't hang, but APIs will return 500
    app.listen(PORT, () => {
      console.log(`[Server Warning] Server listening on ${PORT} in disconnected state. Start MySQL in XAMPP!`);
    });
  }
}

startServer();
