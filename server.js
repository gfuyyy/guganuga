const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const StorageManager = require('./storage-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// Database setup
const dbPath = path.join(__dirname, 'app.db');
const USE_PG = !!process.env.DATABASE_URL;
let db = null;
let pool = null;

if (USE_PG) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : false });
  console.log('Using PostgreSQL via DATABASE_URL');
} else {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('DB error:', err);
    else console.log('SQLite DB connected at', dbPath);
  });
}

// Initialize storage manager (10GB limit). For PG pass pool so StorageManager can sum image bytes.
const storage = USE_PG ? new StorageManager({ pool }, 10) : new StorageManager(dbPath, 10);

// Initialize tables
async function initTables() {
  if (USE_PG) {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      playerName TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      fullName TEXT,
      birthDate TEXT,
      location TEXT,
      profilePic TEXT,
      createdAt TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS loadouts (
      id TEXT PRIMARY KEY,
      owner TEXT,
      title TEXT,
      image TEXT,
      createdAt TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY(owner) REFERENCES users(playerName)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      fromUser TEXT,
      toUser TEXT,
      loadoutId TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY(fromUser) REFERENCES users(playerName),
      FOREIGN KEY(toUser) REFERENCES users(playerName)
    )`);
  } else {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        playerName TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        fullName TEXT,
        birthDate TEXT,
        location TEXT,
        profilePic TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS loadouts (
        id TEXT PRIMARY KEY,
        owner TEXT,
        title TEXT,
        image TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(owner) REFERENCES users(playerName)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        fromUser TEXT,
        toUser TEXT,
        loadoutId TEXT,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(fromUser) REFERENCES users(playerName),
        FOREIGN KEY(toUser) REFERENCES users(playerName)
      )`);
    });
  }
}

initTables().catch(err => console.error('Error initializing tables:', err));

// ===== STORAGE ENDPOINTS =====

// Get storage info
app.get('/api/storage', (req, res) => {
  storage.getInfo().then(info => res.json(info)).catch(err => res.status(500).json({ error: err.message }));
});

// ===== USER ENDPOINTS =====

// Get all users
app.get('/api/users', (req, res) => {
  if (USE_PG) {
    pool.query('SELECT id, playerName, fullName, location, profilePic FROM users').then(r => res.json(r.rows || [])).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.all(`SELECT id, playerName, fullName, location, profilePic FROM users`, [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  }
});

// Sign up / Create user
app.post('/api/users', (req, res) => {
  const { playerName, email, password, fullName, birthDate, location, profilePic } = req.body;
  if (!playerName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (USE_PG) {
    pool.query('DELETE FROM users WHERE email = $1', [email]).then(() => {
      return pool.query(`INSERT INTO users (playerName, email, password, fullName, birthDate, location, profilePic)
        VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING playerName`, [playerName, email, password, fullName, birthDate, location, profilePic || null]);
    }).then(r => res.json({ success: true, playerName: r.rows[0].playername || playerName })).catch(err => res.status(400).json({ error: err.message }));
  } else {
    db.run(`DELETE FROM users WHERE email = ?`, [email], (delErr) => {
      db.run(
        `INSERT INTO users (playerName, email, password, fullName, birthDate, location, profilePic)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [playerName, email, password, fullName, birthDate, location, profilePic || null],
        (err) => {
          if (err) return res.status(400).json({ error: err.message });
          res.json({ success: true, playerName });
        }
      );
    });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (USE_PG) {
    pool.query('SELECT playerName, email FROM users WHERE email = $1 AND password = $2', [email, password]).then(r => {
      if (!r.rows || r.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
      res.json({ playerName: r.rows[0].playername });
    }).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.get(
      `SELECT playerName, email FROM users WHERE email = ? AND password = ?`,
      [email, password],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid email or password' });
        res.json({ playerName: row.playerName });
      }
    );
  }
});

// Get user by name
app.get('/api/users/:playerName', (req, res) => {
  if (USE_PG) {
    pool.query('SELECT playerName, email, password, fullName, birthDate, location, profilePic FROM users WHERE playerName = $1', [req.params.playerName]).then(r => {
      if (!r.rows || r.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(r.rows[0]);
    }).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.get(
      `SELECT playerName, email, password, fullName, birthDate, location, profilePic FROM users WHERE playerName = ?`,
      [req.params.playerName],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'User not found' });
        res.json(row);
      }
    );
  }
});

// Update profile picture
app.put('/api/users/:playerName/profilePic', (req, res) => {
  const { profilePic } = req.body;
  if (USE_PG) {
    pool.query('UPDATE users SET profilePic = $1 WHERE playerName = $2', [profilePic, req.params.playerName]).then(() => res.json({ success: true })).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.run(
      `UPDATE users SET profilePic = ? WHERE playerName = ?`,
      [profilePic, req.params.playerName],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// ===== LOADOUT ENDPOINTS =====

// Get all loadouts
app.get('/api/loadouts', (req, res) => {
  if (USE_PG) {
    pool.query('SELECT id, owner, title, image, createdAt FROM loadouts ORDER BY createdAt DESC').then(r => res.json(r.rows || [])).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.all(
      `SELECT id, owner, title, image, createdAt FROM loadouts ORDER BY createdAt DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  }
});

// Create loadout
app.post('/api/loadouts', (req, res) => {
  const { id, owner, title, image } = req.body;
  if (!id || !owner || !title || !image) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  (async () => {
    const storageInfo = await storage.getInfo();
    if (!storageInfo.canStore) return res.status(507).json({ error: 'Storage full', storage: storageInfo });
    const imageSizeKB = Math.ceil(image.length / 1024);
    if (!(await storage.canAddData(imageSizeKB * 1024))) return res.status(507).json({ error: 'Not enough storage for this upload', storage: storageInfo, neededKB: imageSizeKB });

    if (USE_PG) {
      try {
        await pool.query('INSERT INTO loadouts (id, owner, title, image) VALUES ($1,$2,$3,$4)', [id, owner, title, image]);
        const newInfo = await storage.getInfo();
        return res.json({ success: true, id, storage: newInfo });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    } else {
      db.run(
        `INSERT INTO loadouts (id, owner, title, image) VALUES (?, ?, ?, ?)`,
        [id, owner, title, image],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          storage.getInfo().then(info => res.json({ success: true, id, storage: info })).catch(e => res.json({ success: true, id }));
        }
      );
    }
  })();
});

// ===== REQUEST ENDPOINTS =====

// Get all trade requests
app.get('/api/requests', (req, res) => {
  if (USE_PG) {
    pool.query('SELECT id, fromUser, toUser, loadoutId, status FROM requests ORDER BY createdAt DESC').then(r => res.json(r.rows || [])).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.all(
      `SELECT id, fromUser, toUser, loadoutId, status FROM requests ORDER BY createdAt DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
      }
    );
  }
});

// Create trade request
app.post('/api/requests', (req, res) => {
  const { id, from, to, loadoutId } = req.body;
  if (!id || !from || !to || !loadoutId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (USE_PG) {
    pool.query('INSERT INTO requests (id, fromUser, toUser, loadoutId) VALUES ($1,$2,$3,$4)', [id, from, to, loadoutId]).then(() => res.json({ success: true, id })).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.run(
      `INSERT INTO requests (id, fromUser, toUser, loadoutId) VALUES (?, ?, ?, ?)`,
      [id, from, to, loadoutId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id });
      }
    );
  }
});

// Update request status
app.put('/api/requests/:id', (req, res) => {
  const { status } = req.body;
  if (USE_PG) {
    pool.query('UPDATE requests SET status = $1 WHERE id = $2', [status, req.params.id]).then(() => res.json({ success: true })).catch(err => res.status(500).json({ error: err.message }));
  } else {
    db.run(
      `UPDATE requests SET status = ? WHERE id = ?`,
      [status, req.params.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ Server running on port ${PORT}`);
  if (!process.env.PORT) {
    console.log(`✓ Access locally at: http://localhost:${PORT}`);
    console.log(`✓ Access from other devices on your network at: http://<YOUR-PC-IP>:${PORT}`);
    console.log(`✓ Find your PC IP: Run 'ipconfig' in PowerShell and look for IPv4 address (e.g., 192.168.x.x)\n`);
  } else {
    console.log('✓ Running in cloud (PORT provided by host)');
  }
});
