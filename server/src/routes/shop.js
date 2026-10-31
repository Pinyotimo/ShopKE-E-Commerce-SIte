import { Router } from 'express';
import { q, tx } from '../db.js';
import { auth } from '../auth.js';
import { quote } from '../delivery.js';
import { normPhone } from '../mpesa.js';
const r = Router();

r.get('/products', async (req, res) => {
  const { search = '', category = '' } = req.query;
  res.json(await q(`SELECT * FROM products WHERE active AND name ILIKE $1 AND ($2='' OR category=$2) ORDER BY id`,
    [`%${search}%`, category]));
});
r.get('/products/:id', async (req, res) => {
  const [p] = await q('SELECT * FROM products WHERE id=$1 AND active', [req.params.id]);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

r.post('/delivery/quote', (req, res) => {
  const { lat, lng, subtotal } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'Location required' });
  const d = quote(lat, lng, +subtotal || 0);
  res.status(d.ok ? 200 : 422).json(d);
});

r.post('/orders', auth, async (req, res) => {
  const { items, address, lat, lng, phone } = req.body;
  const ph = normPhone(phone);
  if (!Array.isArray(items) || !items.length || !address?.trim() || typeof lat !== 'number' || typeof lng !== 'number' || !ph)
    return res.status(400).json({ error: 'Invalid order (check items, address, location, M-Pesa phone)' });
  const merged = new Map();
  for (const i of items) merged.set(+i.productId, (merged.get(+i.productId) || 0) + Math.floor(+i.qty));
  try {
    const order = await tx(async c => {
      const { rows: ps } = await c.query('SELECT * FROM products WHERE id=ANY($1) AND active FOR UPDATE', [[...merged.keys()]]);
      let sub = 0; const lines = [];
      for (const [id, n] of merged) {
        const p = ps.find(x => x.id === id);
        if (!p || n < 1) throw new Error('Invalid item');
        if (p.stock < n) throw new Error(`Only ${p.stock} of ${p.name} left`);
        sub += p.price * n; lines.push([p, n]);
      }
      const d = quote(lat, lng, sub);
      if (!d.ok) throw new Error(d.error);
      const { rows: [o] } = await c.query(
        `INSERT INTO orders(user_id,subtotal,delivery_fee,total,address,lat,lng,distance_km,phone)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [req.user.id, sub, d.fee, sub + d.fee, address.trim(), lat, lng, d.distanceKm, ph]);
      for (const [p, n] of lines) {
        await c.query('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES($1,$2,$3,$4,$5)', [o.id, p.id, p.name, p.price, n]);
        await c.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [n, p.id]);
      }
      return o;
    });
    res.status(201).json(order);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const ORDER_SQL = `SELECT o.*,
  (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty,'price',i.price)) FROM order_items i WHERE i.order_id=o.id) items,
  (SELECT status FROM refunds f WHERE f.order_id=o.id ORDER BY f.id DESC LIMIT 1) refund_status
  FROM orders o WHERE o.user_id=$1`;
r.get('/orders', auth, async (req, res) => res.json(await q(ORDER_SQL + ' ORDER BY o.id DESC', [req.user.id])));
r.get('/orders/:id', auth, async (req, res) => {
  const [o] = await q(ORDER_SQL + ' AND o.id=$2', [req.user.id, req.params.id]);
  o ? res.json(o) : res.status(404).json({ error: 'Not found' });
});
export default r;