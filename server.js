// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const helmet = require('helmet');

const app = express();
const DB_PATH = process.env.DB_PATH || './data.db';
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// simple session (for production replace MemoryStore)
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24*60*60*1000 } // secure:true if HTTPS
}));

// open/create DB
const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Helper: get current user from session
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    if (password.length < 6) return res.status(400).json({ error: 'Password too short (min 6)' });

    const hash = await bcrypt.hash(password, 12);

    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    stmt.run(username, email, hash, function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already used' });
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      req.session.userId = this.lastID;
      res.json({ ok: true, userId: this.lastID });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).json({ error: 'Missing fields' });

  const q = 'SELECT id, username, email, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1';
  db.get(q, [emailOrUsername, emailOrUsername], async (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    if (!row) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = row.id;
    res.json({ ok: true, id: row.id, username: row.username });
  });
});

// Get profile (protected)
app.get('/api/profile', requireAuth, (req, res) => {
  const q = 'SELECT id, username, email, created_at FROM users WHERE id = ?';
  db.get(q, [req.session.userId], (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'DB error' }); }
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json({ user: row });
  });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ ok: true });
  });
});

// fallback to index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
