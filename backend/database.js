const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// En production sur Render, la DB est sur le disque persistant monté sur /var/data
// En dev, elle est dans le dossier backend
const DB_DIR = process.env.NODE_ENV === 'production' ? '/var/data' : __dirname;
const DB_PATH = path.join(DB_DIR, 'padel.db');

class SyncDB {
  constructor(sqlJs) {
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      this._db = new sqlJs.Database(fileBuffer);
      console.log(`DB chargée depuis ${DB_PATH}`);
    } else {
      this._db = new sqlJs.Database();
      console.log(`Nouvelle DB créée à ${DB_PATH}`);
    }
  }

  _save() {
    try {
      const data = this._db.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    } catch (e) {
      console.error('DB save error:', e);
    }
  }

  prepare(sql) {
    const sqldb = this._db;
    const save = this._save.bind(this);

    return {
      run(...params) {
        sqldb.run(sql, params);
        save();
        return { changes: 1 };
      },
      get(...params) {
        const stmt = sqldb.prepare(sql);
        stmt.bind(params);
        let row;
        if (stmt.step()) {
          row = stmt.getAsObject();
        }
        stmt.free();
        return row;
      },
      all(...params) {
        const results = [];
        const stmt = sqldb.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    };
  }
}

let dbInstance = null;

async function initDB() {
  if (dbInstance) return dbInstance;

  console.log('Initializing sql.js...');
  const SQL = await initSqlJs({
    locateFile: file => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file)
  });

  console.log('sql.js loaded, opening DB...');
  dbInstance = new SyncDB(SQL);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT,
      description TEXT,
      opponent TEXT,
      score TEXT,
      date TEXT,
      surface TEXT,
      analyzed_player INTEGER DEFAULT 1,
      video_filename TEXT,
      video_path TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      strengths TEXT,
      weaknesses TEXT,
      positives TEXT,
      improvements TEXT,
      tactical_adaptation TEXT,
      advice TEXT,
      global_score REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  dbInstance._save();

  // Migrations : ajouter colonnes frames si elles n'existent pas encore
  try { dbInstance._db.run('ALTER TABLE matches ADD COLUMN player_frame TEXT'); } catch {}
  try { dbInstance._db.run('ALTER TABLE matches ADD COLUMN full_frame TEXT'); } catch {}
  dbInstance._save();

  console.log('DB ready ✅');
  return dbInstance;
}

function getDB() {
  if (!dbInstance) throw new Error('DB not initialized — call initDB() first');
  return dbInstance;
}

module.exports = { initDB, getDB };
