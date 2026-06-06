const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Dossier de stockage des frames — toujours dans uploads/frames (dev et prod)
// /var/data n'existe que si un disque persistant Render est configuré
const FRAMES_DIR = path.join(__dirname, '../uploads/frames');

// Chercher ffmpeg dans les chemins courants Linux/Render
function findFfmpeg() {
  const candidates = [
    'ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/render/project/src/node_modules/.bin/ffmpeg',
  ];
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} -version`, { timeout: 5000, stdio: 'pipe' });
      return cmd;
    } catch {}
  }
  return null;
}

let FFMPEG_PATH = null;
let FFPROBE_PATH = null;

function initFfmpeg() {
  if (FFMPEG_PATH !== null) return FFMPEG_PATH;
  FFMPEG_PATH = findFfmpeg() || '';
  // ffprobe suit le même chemin que ffmpeg
  FFPROBE_PATH = FFMPEG_PATH ? FFMPEG_PATH.replace('ffmpeg', 'ffprobe') : '';
  console.log(`extractFrames: ffmpeg=${FFMPEG_PATH || 'NON TROUVÉ'}`);
  return FFMPEG_PATH;
}

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

  const ffmpeg = initFfmpeg();
  if (!ffmpeg) {
    console.warn('extractFrames: ffmpeg introuvable sur ce serveur');
    return { playerFrame: null, fullFrame: null };
  }

  ensureDir();

  const playerFrameFile = path.join(FRAMES_DIR, `${matchId}_player${playerNum}.jpg`);
  const fullFrameFile   = path.join(FRAMES_DIR, `${matchId}_full.jpg`);

  try {
    // 1. Récupérer la durée de la vidéo
    let seekTime = 5;
    try {
      const ffprobe = FFPROBE_PATH || ffmpeg.replace('ffmpeg', 'ffprobe');
      const dur = execSync(
        `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
        { timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).toString().trim();
      const duration = parseFloat(dur);
      if (!isNaN(duration) && duration > 2) {
        seekTime = Math.max(1, Math.min(duration * 0.30, duration - 1)).toFixed(2);
      }
    } catch (e) {
      console.warn('ffprobe erreur (fallback 5s) :', e.message);
    }

    // 2. Extraire le frame complet
    execSync(
      `"${ffmpeg}" -ss ${seekTime} -i "${videoPath}" -vframes 1 -q:v 2 "${fullFrameFile}" -y`,
      { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    // 3. Extraire le frame croppé sur le joueur (max 480px de large)
    const crop = getPlayerCrop(playerNum);
    execSync(
      `"${ffmpeg}" -ss ${seekTime} -i "${videoPath}" -vframes 1 -vf "${crop},scale=480:-1" -q:v 3 "${playerFrameFile}" -y`,
      { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const result = {
      playerFrame: fs.existsSync(playerFrameFile) ? `${matchId}_player${playerNum}.jpg` : null,
      fullFrame:   fs.existsSync(fullFrameFile)   ? `${matchId}_full.jpg`               : null,
    };
    console.log(`extractFrames: OK → ${result.playerFrame} | ${result.fullFrame}`);
    return result;

  } catch (err) {
    console.error('extractFrames erreur :', err.message);
    return { playerFrame: null, fullFrame: null };
  }
}

module.exports = { extractPlayerFrame, FRAMES_DIR };
