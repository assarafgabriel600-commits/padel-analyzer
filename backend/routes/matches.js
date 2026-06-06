const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const auth = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Seules les vidéos sont acceptées'));
  }
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET all matches for user
router.get('/', auth, (req, res) => {
  const db = getDB();
  const matches = db.prepare(`
    SELECT m.id, m.title, m.opponent, m.score, m.date, m.surface,
           m.analyzed_player, m.status, m.created_at,
           r.id as report_id, r.global_score, r.summary
    FROM matches m
    LEFT JOIN reports r ON r.match_id = m.id
    WHERE m.user_id = ?
    ORDER BY m.created_at DESC
  `).all(req.user.id);
  res.json(matches);
});

// GET match status
router.get('/:id/status', auth, (req, res) => {
  const db = getDB();
  const match = db.prepare('SELECT id, status FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });
  res.json({ status: match.status });
});

// GET single match
router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const match = db.prepare('SELECT * FROM matches WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!match) return res.status(404).json({ error: 'Match introuvable' });
  res.json(match);
});

// POST create match + analyze
router.post('/', auth, upload.single('video'), async (req, res) => {
  const { description, opponent, score, date, surface, analyzed_player, title } = req.body;
  const db = getDB();

  const matchId = uuidv4();
  const videoFilename = req.file?.filename || null;
  const videoPath = req.file?.path || null;

  db.prepare(`
    INSERT INTO matches (id, user_id, title, description, opponent, score, date, surface, analyzed_player, video_filename, video_path, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzing')
  `).run(matchId, req.user.id, title || `Match vs ${opponent || 'inconnu'}`, description, opponent, score, date, surface, analyzed_player || 1, videoFilename, videoPath);

  // Réponse immédiate, analyse en arrière-plan
  res.json({ matchId, status: 'analyzing' });

  analyzeMatch(matchId, req.user.id, { description, opponent, score, date, surface, analyzed_player, videoPath })
    .catch(err => {
      console.error('Erreur analyse:', err);
      getDB().prepare("UPDATE matches SET status = 'error' WHERE id = ?").run(matchId);
    });
});

async function analyzeMatch(matchId, userId, data) {
  const { description, opponent, score, date, surface, analyzed_player, videoPath } = data;
  const playerLabel = analyzed_player == 2 ? 'Joueur 2' : 'Joueur 1';

  const systemPrompt = `Tu es un coach professionnel de padel avec plus de 15 ans d'expérience.
On te fournit une description d'un match et potentiellement une vidéo.
Analyse en détail le joueur sélectionné : ses déplacements, ses coups (bandeja, vibora, smash, lob, volée, drive, slice),
sa tactique, sa gestion du stress, sa communication avec son partenaire, son positionnement sur le court.
Génère un rapport structuré, précis et bienveillant avec des conseils concrets et actionnables.

IMPORTANT: Réponds UNIQUEMENT en JSON valide avec exactement cette structure:
{
  "summary": "Résumé général du match en 2-3 phrases",
  "strengths": ["Point fort 1", "Point fort 2", "Point fort 3"],
  "weaknesses": ["Point faible 1", "Point faible 2", "Point faible 3"],
  "positives": ["Ce qu'il a bien fait 1", "Ce qu'il a bien fait 2", "Ce qu'il a bien fait 3"],
  "improvements": ["Ce qu'il doit améliorer 1", "Ce qu'il doit améliorer 2", "Ce qu'il doit améliorer 3"],
  "tactical_adaptation": "Explication de comment il aurait dû s'adapter tactiquement (2-3 paragraphes)",
  "advice": ["Conseil concret 1", "Conseil concret 2", "Conseil concret 3", "Conseil concret 4", "Conseil concret 5"],
  "global_score": 7.5,
  "detailed_analysis": {
    "movements": "Analyse des déplacements",
    "shots": "Analyse des coups",
    "tactics": "Analyse tactique",
    "mental": "Gestion mentale et stress",
    "partnership": "Communication avec le partenaire"
  }
}`;

  let videoNote = '';
  if (videoPath && fs.existsSync(videoPath)) {
    const stats = fs.statSync(videoPath);
    videoNote = `\n[Vidéo uploadée : ${(stats.size / 1024 / 1024).toFixed(1)} MB — analyse basée sur la description et les informations fournies]`;
  }

  const userMessage = `Analyse le ${playerLabel} dans ce match de padel.

Informations du match :
- Adversaire : ${opponent || 'Non précisé'}
- Score : ${score || 'Non précisé'}
- Date : ${date || 'Non précisée'}
- Surface : ${surface || 'Non précisée'}
- Joueur analysé : ${playerLabel}
${videoNote}

Description du match :
${description || 'Aucune description fournie — génère une analyse type basée sur les informations disponibles.'}

Génère un rapport complet et structuré en JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }]
  });

  const rawContent = response.content[0].text;

  let parsed;
  try {
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
  } catch {
    parsed = {
      summary: rawContent.slice(0, 500),
      strengths: [], weaknesses: [], positives: [], improvements: [],
      tactical_adaptation: '', advice: [], global_score: 0, detailed_analysis: {}
    };
  }

  const reportId = uuidv4();
  const db = getDB();
  db.prepare(`
    INSERT INTO reports (id, match_id, user_id, content, summary, strengths, weaknesses, positives, improvements, tactical_adaptation, advice, global_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reportId, matchId, userId, rawContent,
    parsed.summary || '',
    JSON.stringify(parsed.strengths || []),
    JSON.stringify(parsed.weaknesses || []),
    JSON.stringify(parsed.positives || []),
    JSON.stringify(parsed.improvements || []),
    parsed.tactical_adaptation || '',
    JSON.stringify(parsed.advice || []),
    parsed.global_score || 0
  );

  db.prepare("UPDATE matches SET status = 'completed' WHERE id = ?").run(matchId);
}

module.exports = router;
