const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const StorageManager = require('./storage-manager');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname)));

// Database setup
const dbPath = path.join(__dirname, 'app.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('DB error:', err);
  else console.log('DB connected at', dbPath);
});

// Initialize storage manager (10GB limit)
const storage = new StorageManager(dbPath, 10);

// Initialize tables
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

// ===== STORAGE ENDPOINTS =====

// Get storage info
app.get('/api/storage', (req, res) => {
  const info = storage.getInfo();
  res.json(info);
});

// ===== USER ENDPOINTS =====

// Get all users
app.get('/api/users', (req, res) => {
  db.all(`SELECT id, playerName, fullName, location, profilePic FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Sign up / Create user
app.post('/api/users', (req, res) => {
  const { playerName, email, password, fullName, birthDate, location, profilePic } = req.body;
  if (!playerName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Delete if email exists (user request)
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
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    `SELECT playerName, email FROM users WHERE email = ? AND password = ?`,
    [email, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: 'Invalid email or password' });
      res.json({ playerName: row.playerName });
    }
  );
});

// Get user by name
app.get('/api/users/:playerName', (req, res) => {
  db.get(
    `SELECT playerName, email, password, fullName, birthDate, location, profilePic FROM users WHERE playerName = ?`,
    [req.params.playerName],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'User not found' });
      res.json(row);
    }
  );
});

// Update profile picture
app.put('/api/users/:playerName/profilePic', (req, res) => {
  const { profilePic } = req.body;
  db.run(
    `UPDATE users SET profilePic = ? WHERE playerName = ?`,
    [profilePic, req.params.playerName],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// ===== LOADOUT ENDPOINTS =====

// Get all loadouts
app.get('/api/loadouts', (req, res) => {
  db.all(
    `SELECT id, owner, title, image, createdAt FROM loadouts ORDER BY createdAt DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Create loadout
app.post('/api/loadouts', (req, res) => {
  const { id, owner, title, image } = req.body;
  if (!id || !owner || !title || !image) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check storage before adding
  const storageInfo = storage.getInfo();
  if (!storageInfo.canStore) {
    return res.status(507).json({ 
      error: 'Storage full', 
      storage: storageInfo 
    });
  }

  // Estimate image size
  const imageSizeKB = Math.ceil(image.length / 1024);
  if (!storage.canAddData(imageSizeKB * 1024)) {
    return res.status(507).json({ 
      error: 'Not enough storage for this upload',
      storage: storageInfo,
      neededKB: imageSizeKB
    });
  }
  
  db.run(
    `INSERT INTO loadouts (id, owner, title, image) VALUES (?, ?, ?, ?)`,
    [id, owner, title, image],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id, storage: storage.getInfo() });
    }
  );
});

// ===== REQUEST ENDPOINTS =====

// Get all trade requests
app.get('/api/requests', (req, res) => {
  db.all(
    `SELECT id, fromUser, toUser, loadoutId, status FROM requests ORDER BY createdAt DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// Create trade request
app.post('/api/requests', (req, res) => {
  const { id, from, to, loadoutId } = req.body;
  if (!id || !from || !to || !loadoutId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  db.run(
    `INSERT INTO requests (id, fromUser, toUser, loadoutId) VALUES (?, ?, ?, ?)`,
    [id, from, to, loadoutId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
});

// Update request status
app.put('/api/requests/:id', (req, res) => {
  const { status } = req.body;
  db.run(
    `UPDATE requests SET status = ? WHERE id = ?`,
    [status, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Access from other devices on your network at: http://<YOUR-PC-IP>:${PORT}`);
  console.log(`✓ Find your PC IP: Run 'ipconfig' in PowerShell and look for IPv4 address (e.g., 192.168.x.x)\n`);
});
