import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { q } from './db.js';

const sign = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
export const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || '').slice(7), process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Login required' }); }
};
// Role is re-read from the DB so demotions take effect immediately
const need = roles => async (req, res, next) => {
  const [u] = await q('SELECT role FROM users WHERE id=$1', [req.user.id]);
  if (!u || !roles.includes(u.role)) return res.status(403).json({ error: 'Not allowed' });
  req.user.role = u.role; next();
};
export const staff = need(['staff', 'admin']);
export const admin = need(['admin']);

const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const r = Router();

r.get('/me', auth, async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE id=$1', [req.user.id]);
  u ? res.json(pub(u)) : res.status(401).json({ error: 'Login required' });
});

r.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));

r.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8)
    return res.status(400).json({ error: 'Name, valid email and 8+ char password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const [u] = await q('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING *',
      [name.trim(), email.toLowerCase(), hash]);
    res.status(201).json({ token: sign(u), user: pub(u) });
  } catch (e) {
    res.status(e.code === '23505' ? 409 : 500).json({ error: e.code === '23505' ? 'Email already registered' : 'Server error' });
  }
});

r.post('/login', async (req, res) => {
  const [u] = await q('SELECT * FROM users WHERE email=$1', [(req.body.email || '').toLowerCase()]);
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password_hash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(u), user: pub(u) });
});
export default r;