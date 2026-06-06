const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Dossier de stockage des frames
const FRAMES_DIR = process.env.NODE_ENV === 'production'
  ? '/var/data/frames'
  : path.join(__dirname, '../uploads/frames');

function ensureDir() {
  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }
}

/**
 * Mapping des joueurs sur le terrain de padel (vue caméra standard latérale) :
 *   Joueur 1 : côté gauche, fond de court  → quart gauche-haut
 *   Joueur 2 : côté gauche, devant         → quart gauche-bas
 *   Joueur 3 : côté droit, fond de court   → quart droit-haut
 *   Joueur 4 : côté droit, devant          → quart droit-bas
 */
function getPlayerCrop(playerNum) {
  switch (parseInt(playerNum)) {
    case 1: return 'crop=iw/2:ih/2:0:0';           // gauche-haut
    case 2: return 'crop=iw/2:ih/2:0:ih/2';         // gauche-bas
    case 3: return 'crop=iw/2:ih/2:iw/2:0';         // droit-haut
    case 4: return 'crop=iw/2:ih/2:iw/2:ih/2';      // droit-bas
    default: return 'crop=iw:ih:0:0';               // image complète
  }
}

/**
 * Extrait un frame de la vidéo au bon instant et croppé sur le joueur analysé.
 * Retourne { playerFrame: "filename.jpg" | null, fullFrame: "filename.jpg" | null }
 */
async function extractPlayerFrame(videoPath, matchId, playerNum) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    console.log('extractFrames: pas de vidéo disponible');
    return { playerFrame: null, fullFrame: null };
  }

  ensureDir();

  const playerFrameFile = path.join(FRAMES_DIR, `${matchId}_player${playerNum}.jpg`);
  const fullFrameFile   = path.join(FRAMES_DIR, `${matchId}_full.jpg`);

  try {
    // 1. Récupérer la durée de la vidéo
    let seekTime = 5; // fallback : 5 secondes
    try {
      const dur = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).toString().trim();
      const duration = parseFloat(dur);
      if (!isNaN(duration) && duration > 2) {
        // Prendre un instant à 30 % de la vidéo (action en cours)
        seekTime = Math.max(1, Math.min(duration * 0.30, duration - 1)).toFixed(2);
      }
    } catch (e) {
      console.warn('ffprobe non disponible ou erreur :', e.message);
    }

    // 2. Extraire le frame complet
    execSync(
      `ffmpeg -ss ${seekTime} -i "${videoPath}" -vframes 1 -q:v 2 "${fullFrameFile}" -y`,
      { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // 3. Extraire le frame croppé + redimensionné sur le joueur (max 480px de large)
    const crop = getPlayerCrop(playerNum);
    execSync(
      `ffmpeg -ss ${seekTime} -i "${videoPath}" -vframes 1 -vf "${crop},scale=480:-1" -q:v 3 "${playerFrameFile}" -y`,
      { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const result = {
      playerFrame: fs.existsSync(playerFrameFile) ? `${matchId}_player${playerNum}.jpg` : null,
      fullFrame:   fs.existsSync(fullFrameFile)   ? `${matchId}_full.jpg`               : null,
    };
    console.log(`extractFrames: OK → ${result.playerFrame}, ${result.fullFrame}`);
    return result;

  } catch (err) {
    console.error('extractFrames erreur :', err.message);
    return { playerFrame: null, fullFrame: null };
  }
}

module.exports = { extractPlayerFrame, FRAMES_DIR };
