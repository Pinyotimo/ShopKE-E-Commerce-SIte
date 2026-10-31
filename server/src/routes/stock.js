import { Router } from 'express';
import { q, tx } from '../db.js';
import { auth, staff } from '../auth.js';
const r = Router();
r.use(auth, staff);

r.get('/stock', async (req, res) => res.json(await q(
  `SELECT p.id,p.name,p.category,p.image_url,p.stock,p.active, COALESCE(s.sold,0) sold30 FROM products p
   LEFT JOIN (SELECT i.product_id, SUM(i.qty)::int sold FROM order_items i JOIN orders o ON o.id=i.order_id
     WHERE o.created_at > now() - interval '30 days' AND o.status NOT IN ('pending','cancelled','refunded') GROUP BY 1) s
   ON s.product_id=p.id ORDER BY p.stock ASC, p.name`)));

r.get('/stock-log', async (req, res) => res.json(await q(
  `SELECT m.*, p.name product, u.name by_user FROM stock_movements m JOIN products p ON p.id=m.product_id
   LEFT JOIN users u ON u.id=m.user_id ORDER BY m.id DESC LIMIT 80`)));

r.post('/stock/:id/adjust', async (req, res) => {
  const n = Math.trunc(+req.body.change), why = String(req.body.reason || '').trim();
  if (!n || !why) return res.status(400).json({ error: 'A non-zero change and a reason are required' });
  try {
    const p = await tx(async c => {
      const { rows: [p] } = await c.query('UPDATE products SET stock=stock+$2 WHERE id=$1 AND stock+$2>=0 RETURNING id,stock', [req.params.id, n]);
      if (!p) throw new Error('Stock cannot go below zero (or product not found)');
      await c.query('INSERT INTO stock_movements(product_id,change,reason,user_id) VALUES($1,$2,$3,$4)', [p.id, n, why, req.user.id]);
      return p;
    });
    res.json(p);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
export default r;