require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

const app = express();

// CORS : en dev on accepte localhost:3000, en prod on accepte le domaine Vercel
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (Postman, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servir les frames extraites des vidéos (même dossier dev et prod)
app.use('/frames', express.static(path.join(__dirname, 'uploads/frames')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/reports', require('./routes/reports'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// Debug : vérifier ffmpeg + dossier frames
app.get('/api/debug/ffmpeg', (req, res) => {
  const { execSync } = require('child_process');
  const framesDir = path.join(__dirname, 'uploads/frames');
  const result = { framesDir, framesDirExists: require('fs').existsSync(framesDir), ffmpeg: null, error: null };
  const candidates = ['ffmpeg', '/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
  for (const cmd of candidates) {
    try {
      const v = execSync(`${cmd} -version`, { timeout: 5000, stdio: 'pipe' }).toString().split('\n')[0];
      result.ffmpeg = `${cmd} → ${v}`;
      break;
    } catch {}
  }
  if (!result.ffmpeg) result.error = 'ffmpeg introuvable';
  res.json(result);
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));

const PORT = process.env.PORT || 5000;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🎾 Padel Analyzer Backend — port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  })
  .catch(err => {
    console.error('FATAL — DB init failed:', err);
    process.exit(1);
  });
