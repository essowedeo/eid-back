import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'db.json');

const DEFAULT_DB = {
  teams: [],
  players: [],
  concours: [],
  nextTeamId: 1,
  nextPlayerId: 1,
  nextConcoursId: 1,
};

export function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = join(__dirname, 'data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
      return { ...DEFAULT_DB };
    }
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    return data;
  } catch (err) {
    console.error('DB read error:', err);
    return { ...DEFAULT_DB };
  }
}

export function writeDB(data) {
  const dir = join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Sauvegarde automatique toutes les heures
const BACKUP_PATH = join(__dirname, 'data', 'db.backup.json');
setInterval(() => {
  try {
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, BACKUP_PATH);
    }
  } catch (e) { /* silencieux */ }
}, 60 * 60 * 1000); // toutes les heures
