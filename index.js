import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import teamsRouter from './routes/teams.js';
import concoursRouter from './routes/concours.js';
import { initDB } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://clay-fame-stunner.ngrok-free.dev',
    'https://eid-front-nine.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Prevent caching for API routes
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks

// Routes
app.use('/api/teams', teamsRouter);
app.use('/api/concours', concoursRouter);

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tournament: 'EID HOOP FEST' });
});

// Démarrage
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏀  EID HOOP FEST API → http://0.0.0.0:${PORT}\n`);
  });
}).catch(console.error);
