const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ucla-dashboard-secret-2026';
const buildPath = path.join(__dirname, 'build');

app.use(express.json());
app.use(cookieParser());

// ── 5 Users (passwords are bcrypt-hashed) ───────────────────────────────────
const USERS = [
  { id: 1, username: 'admin',      name: 'Admin User',       role: 'Admin',          password: bcrypt.hashSync('Admin@123',   10) },
  { id: 2, username: 'jthompson',   name: 'James Thompson',   role: 'Project Manager', password: bcrypt.hashSync('James@123',   10) },
  { id: 3, username: 'schen',       name: 'Sarah Chen',       role: 'Finance Lead',    password: bcrypt.hashSync('Sarah@123',   10) },
  { id: 4, username: 'mrodriguez',  name: 'Maria Rodriguez',  role: 'Director',        password: bcrypt.hashSync('Maria@123',   10) },
  { id: 5, username: 'viewer',      name: 'Guest Viewer',     role: 'Viewer',          password: bcrypt.hashSync('Viewer@123',  10) },
];

// ── Auth endpoints ──────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
});

app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    res.json({ user: { id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role } });
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
});

// ── Serve React app ─────────────────────────────────────────────────────────
app.use(express.static(buildPath));
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running on port ${PORT}`);
});
