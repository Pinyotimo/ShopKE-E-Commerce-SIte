import { Router } from 'express';
import { q } from '../db.js';
import { auth, admin } from '../auth.js';
const r = Router();
r.use(auth, admin);

r.get('/coupons', async (req, res) => res.json(await q('SELECT * FROM coupons ORDER BY id DESC')));

r.post('/coupons', async (req, res) => {
  const b = req.body, code = String(b.code || '').trim().toUpperCase(), value = Math.round(+b.value);
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return res.status(400).json({ error: 'Code: 3-20 letters, numbers, - or _' });
  if (!['percent', 'fixed'].includes(b.kind) || !(value > 0) || (b.kind === 'percent' && value > 90))
    return res.status(400).json({ error: 'Invalid discount (percent max 90)' });
  try {
    const [c] = await q(`INSERT INTO coupons(code,kind,value,min_subtotal,max_uses,expires_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [code, b.kind, value, Math.max(0, Math.round(+b.min_subtotal) || 0), +b.max_uses > 0 ? Math.round(+b.max_uses) : null, b.expires_at || null]);
    res.status(201).json(c);
  } catch (e) { res.status(e.code === '23505' ? 409 : 500).json({ error: e.code === '23505' ? 'Code already exists' : 'Server error' }); }
});

r.patch('/coupons/:id', async (req, res) => {
  const [c] = await q('UPDATE coupons SET active=$2 WHERE id=$1 RETURNING *', [req.params.id, !!req.body.active]);
  c ? res.json(c) : res.status(404).json({ error: 'Not found' });
});

r.delete('/coupons/:id', async (req, res) => {
  const [c] = await q('SELECT used FROM coupons WHERE id=$1', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (c.used > 0) { await q('UPDATE coupons SET active=false WHERE id=$1', [req.params.id]); return res.json({ archived: true }); }
  await q('DELETE FROM coupons WHERE id=$1', [req.params.id]);
  res.json({ deleted: true });
});
export default r;