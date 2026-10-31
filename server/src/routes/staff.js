
import { Router } from 'express';
import { q } from '../db.js';
import { auth, staff } from '../auth.js';
import { notify } from '../notify.js';
const r = Router();
r.use(auth, staff);

r.get('/orders', async (req, res) => res.json(await q(
  `SELECT o.*, u.name customer,
     (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty)) FROM order_items i WHERE i.order_id=o.id) items,
     (SELECT status FROM refunds f WHERE f.order_id=o.id ORDER BY f.id DESC LIMIT 1) refund_status
   FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC LIMIT 300`)));

const LABEL = { packed: 'is packed', out_for_delivery: 'is out for delivery', delivered: 'was delivered' };
r.patch('/orders/:id/status', async (req, res) => {
  const s = req.body.status;
  if (!Object.hasOwn(LABEL, s)) return res.status(400).json({ error: 'Bad status' });
  const [o] = await q(`UPDATE orders SET status=$2 WHERE id=$1 AND status IN ('paid','packed','out_for_delivery') RETURNING *`, [req.params.id, s]);
  if (!o) return res.status(400).json({ error: 'Order cannot change to that status' });
  notify(o.user_id, `Order #${o.id} ${LABEL[s]}`, '', '/orders');
  res.json(o);
});

// Whitelisted, validated product fields (keys are safe to interpolate into SQL)
const clean = b => {
  const o = {};
  if (b.name !== undefined) { o.name = String(b.name).trim(); if (!o.name) return null; }
  if (b.description !== undefined) o.description = String(b.description);
  if (b.price !== undefined) { o.price = Math.round(+b.price); if (!(o.price > 0)) return null; }
  if (b.stock !== undefined) { o.stock = Math.floor(+b.stock); if (!(o.stock >= 0)) return null; }
  if (b.image_url !== undefined) o.image_url = String(b.image_url).trim() || null;
  if (b.category !== undefined) o.category = String(b.category).trim() || 'General';
  if (b.active !== undefined) o.active = !!b.active;
  return o;
};

r.get('/products', async (req, res) => res.json(await q('SELECT * FROM products ORDER BY id DESC')));

r.post('/products', async (req, res) => {
  const o = clean(req.body);
  if (!o || !o.name || !o.price) return res.status(400).json({ error: 'Valid name and price required' });
  const k = Object.keys(o);
  const [p] = await q(`INSERT INTO products(${k.join(',')}) VALUES(${k.map((_, i) => '$' + (i + 1)).join(',')}) RETURNING *`, k.map(x => o[x]));
  res.status(201).json(p);
});

r.patch('/products/:id', async (req, res) => {
  const o = clean(req.body), k = o && Object.keys(o);
  if (!k?.length) return res.status(400).json({ error: 'Nothing valid to update' });
  const [p] = await q(`UPDATE products SET ${k.map((x, i) => `${x}=$${i + 2}`).join(',')} WHERE id=$1 RETURNING *`,
    [req.params.id, ...k.map(x => o[x])]);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

// Hard delete; if past orders reference it, archive instead (keeps order history intact)
r.delete('/products/:id', async (req, res) => {
  try {
    const rows = await q('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
    rows[0] ? res.json({ deleted: true }) : res.status(404).json({ error: 'Not found' });
  } catch (e) {
    if (e.code !== '23503') throw e;
    await q('UPDATE products SET active=false WHERE id=$1', [req.params.id]);
    res.json({ archived: true });
  }
});
export default r;