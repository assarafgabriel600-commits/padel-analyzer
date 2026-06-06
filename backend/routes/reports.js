const express = require('express');
const { getDB } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const db = getDB();
  const reports = db.prepare(`
    SELECT r.id, r.match_id, r.global_score, r.summary, r.created_at,
           m.title, m.opponent, m.score, m.date, m.surface, m.analyzed_player
    FROM reports r
    JOIN matches m ON m.id = r.match_id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `).all(req.user.id);
  res.json(reports);
});

router.get('/match/:matchId', auth, (req, res) => {
  const db = getDB();
  const report = db.prepare(`
    SELECT r.*, m.title, m.opponent, m.score, m.date, m.surface,
           m.analyzed_player, m.description, m.player_frame, m.full_frame
    FROM reports r
    JOIN matches m ON m.id = r.match_id
    WHERE r.match_id = ? AND r.user_id = ?
  `).get(req.params.matchId, req.user.id);

  if (!report) return res.status(404).json({ error: 'Rapport introuvable' });

  ['strengths', 'weaknesses', 'positives', 'improvements', 'advice'].forEach(field => {
    try { report[field] = JSON.parse(report[field]); } catch { report[field] = []; }
  });

  res.json(report);
});

router.get('/:id', auth, (req, res) => {
  const db = getDB();
  const report = db.prepare(`
    SELECT r.*, m.title, m.opponent, m.score, m.date, m.surface,
           m.analyzed_player, m.description, m.player_frame, m.full_frame
    FROM reports r
    JOIN matches m ON m.id = r.match_id
    WHERE r.id = ? AND r.user_id = ?
  `).get(req.params.id, req.user.id);

  if (!report) return res.status(404).json({ error: 'Rapport introuvable' });

  ['strengths', 'weaknesses', 'positives', 'improvements', 'advice'].forEach(field => {
    try { report[field] = JSON.parse(report[field]); } catch { report[field] = []; }
  });

  res.json(report);
});

module.exports = router;
