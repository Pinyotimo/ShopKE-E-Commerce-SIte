import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { q, tx } from '../db.js';
import { auth, soft } from '../auth.js';
import { normPhone } from '../mpesa.js';
import { price } from '../pricing.js';
import { track } from '../notify.js';
const r = Router();

const PN = `CASE WHEN p.sale_price IS NOT NULL AND (p.sale_ends_at IS NULL OR p.sale_ends_at > now()) THEN p.sale_price ELSE p.price END AS price_now`;
const ON_SALE = `p.sale_price IS NOT NULL AND (p.sale_ends_at IS NULL OR p.sale_ends_at > now())`;

r.get('/products', async (req, res) => {
  const { search = '', category = '', sale = '' } = req.query;
  res.json(await q(`SELECT p.*, ${PN} FROM products p WHERE p.active AND p.name ILIKE $1 AND ($2='' OR p.category=$2)
    AND ($3<>'1' OR (${ON_SALE})) ORDER BY p.id`, [`%${search}%`, String(category), String(sale)]));
});

r.get('/categories', async (req, res) => res.json(await q(
  `SELECT category name, COUNT(*)::int n, (array_agg(image_url ORDER BY id))[1] image
   FROM products WHERE active GROUP BY category ORDER BY n DESC, category`)));

r.get('/flash-sales', async (req, res) => res.json(await q(
  `SELECT p.*, ${PN} FROM products p WHERE p.active AND p.stock>0 AND p.sale_price IS NOT NULL AND p.sale_ends_at > now()
   ORDER BY p.sale_ends_at LIMIT 12`)));

// Personalised when logged in (past categories, minus what they already bought); otherwise best sellers
r.get('/recommendations', soft, async (req, res) => res.json(await q(
  `WITH pop AS (SELECT i.product_id, SUM(i.qty) n FROM order_items i JOIN orders o ON o.id=i.order_id
       WHERE o.status NOT IN ('pending','cancelled','refunded') GROUP BY 1),
     mine AS (SELECT DISTINCT i.product_id FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.user_id=$1),
     cats AS (SELECT p.category, SUM(i.qty) w FROM order_items i JOIN orders o ON o.id=i.order_id
       JOIN products p ON p.id=i.product_id WHERE o.user_id=$1 AND o.status NOT IN ('pending','cancelled') GROUP BY 1)
   SELECT p.*, ${PN} FROM products p LEFT JOIN cats c ON c.category=p.category LEFT JOIN pop ON pop.product_id=p.id
   WHERE p.active AND p.stock>0 AND NOT EXISTS (SELECT 1 FROM mine WHERE mine.product_id=p.id)
   ORDER BY COALESCE(c.w,0) DESC, COALESCE(pop.n,0) DESC, p.id DESC LIMIT 8`, [req.user?.id ?? 0])));

r.get('/products/:id', async (req, res) => {
  const [p] = await q(`SELECT p.*, ${PN} FROM products p WHERE p.id=$1 AND p.active`, [req.params.id]);
  p ? res.json(p) : res.status(404).json({ error: 'Not found' });
});

// "Customers also bought", topped up from the same category
r.get('/products/:id/related', async (req, res) => {
  const id = +req.params.id || 0;
  let rel = await q(`SELECT p.*, ${PN} FROM order_items a JOIN order_items b ON b.order_id=a.order_id AND b.product_id<>a.product_id
    JOIN products p ON p.id=b.product_id WHERE a.product_id=$1 AND p.active AND p.stock>0 GROUP BY p.id ORDER BY COUNT(*) DESC LIMIT 4`, [id]);
  if (rel.length < 4) rel = [...rel, ...await q(`SELECT p.*, ${PN} FROM products p WHERE p.active AND p.stock>0 AND p.id<>$1 AND p.id<>ALL($2)
    AND p.category=(SELECT category FROM products WHERE id=$1) LIMIT $3`, [id, rel.map(x => x.id), 4 - rel.length])];
  res.json(rel);
});

// Server-side pricing: subtotal, coupon, delivery, total. The client only displays this.
r.post('/checkout/quote', async (req, res) => {
  const { items, lat, lng, coupon } = req.body;
  try {
    const x = await price(q, items, lat, lng, coupon);
    res.json({ subtotal: x.sub, discount: x.discount, coupon: x.cp?.code || null, couponError: x.couponError, delivery: x.d, total: x.total });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

r.post('/orders', auth, async (req, res) => {
  const { items, address, lat, lng, phone, coupon } = req.body;
  const ph = normPhone(phone);
  if (!address?.trim() || typeof lat !== 'number' || typeof lng !== 'number' || !ph)
    return res.status(400).json({ error: 'Check address, map location and M-Pesa phone' });
  try {
    const order = await tx(async c => {
      const run = (s, p) => c.query(s, p).then(x => x.rows);
      const x = await price(run, items, lat, lng, coupon, 'FOR UPDATE');
      if (coupon && x.couponError) throw new Error(x.couponError);
      if (!x.d.ok) throw new Error(x.d.error);
      const [o] = await run(`INSERT INTO orders(user_id,subtotal,discount,coupon_code,delivery_fee,total,address,lat,lng,distance_km,phone)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [req.user.id, x.sub, x.discount, x.cp?.code || null, x.d.fee, x.total, address.trim(), lat, lng, x.d.distanceKm, ph]);
      for (const { p, n, u } of x.lines) {
        await c.query('INSERT INTO order_items(order_id,product_id,name,price,qty) VALUES($1,$2,$3,$4,$5)', [o.id, p.id, p.name, u, n]);
        await c.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [n, p.id]);
        await c.query(`INSERT INTO stock_movements(product_id,change,reason,order_id) VALUES($1,$2,'order',$3)`, [p.id, -n, o.id]);
      }
      if (x.cp) await c.query('UPDATE coupons SET used=used+1 WHERE id=$1', [x.cp.id]);
      return o;
    });
    track(order.id, 'pending', 'Order placed');
    res.status(201).json(order);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

const ITEMS = `(SELECT json_agg(json_build_object('name',i.name,'qty',i.qty,'price',i.price)) FROM order_items i WHERE i.order_id=o.id) items`;
const EVENTS = `(SELECT json_agg(json_build_object('status',e.status,'note',e.note,'at',e.created_at) ORDER BY e.id) FROM order_events e WHERE e.order_id=o.id) events`;
const ORDER_SQL = `SELECT o.*, ${ITEMS}, ${EVENTS},
  (SELECT status FROM refunds f WHERE f.order_id=o.id ORDER BY f.id DESC LIMIT 1) refund_status,
  (SELECT json_build_object('method',p.method,'receipt',p.mpesa_receipt,'status',p.status) FROM payments p
     WHERE p.order_id=o.id AND p.status IN ('paid','review') ORDER BY p.id DESC LIMIT 1) payment
  FROM orders o WHERE o.user_id=$1`;
r.get('/orders', auth, async (req, res) => res.json(await q(ORDER_SQL + ' ORDER BY o.id DESC', [req.user.id])));
r.get('/orders/:id', auth, async (req, res) => {
  const [o] = await q(ORDER_SQL + ' AND o.id=$2', [req.user.id, +req.params.id || 0]);
  o ? res.json(o) : res.status(404).json({ error: 'Not found' });
});

// Public tracking: order number + the phone used at checkout
r.post('/track', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }), async (req, res) => {
  const ph = normPhone(req.body.phone);
  const [o] = ph ? await q(`SELECT o.id,o.status,o.created_at,o.total,o.address, ${ITEMS}, ${EVENTS}
    FROM orders o WHERE o.id=$1 AND o.phone=$2`, [+req.body.orderId || 0, ph]) : [];
  o ? res.json(o) : res.status(404).json({ error: 'No order matches that number and phone' });
});
export default r;