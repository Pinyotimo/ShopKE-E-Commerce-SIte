import { Router } from 'express';
import { q, tx } from '../db.js';
import { auth, admin } from '../auth.js';
import { notify, track } from '../notify.js';
const r = Router();
r.use(auth, admin);

r.get('/payments', async (req, res) => {
  const [summary] = await q(`SELECT
    (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE status='paid') paid_payments,
    (SELECT COALESCE(SUM(total),0)::int FROM orders WHERE status IN ('paid','packed','out_for_delivery','delivered')) paid_orders,
    (SELECT COUNT(*)::int FROM payments WHERE status='review') review,
    (SELECT COUNT(*)::int FROM orders o WHERE o.status IN ('paid','packed','out_for_delivery','delivered')
       AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id=o.id AND p.status='paid')) orphans`);
  const rows = await q(`SELECT p.id,p.order_id,p.method,p.status,p.amount,p.paid_amount,p.mpesa_receipt,p.reference,p.note,p.created_at,
      o.status order_status, o.phone, u.name customer
    FROM payments p JOIN orders o ON o.id=p.order_id JOIN users u ON u.id=o.user_id
    ORDER BY (p.status='review') DESC, p.id DESC LIMIT 300`);
  res.json({ summary, rows });
});

// Owner confirms that a flagged payment belongs to its order
r.post('/payments/:id/match', async (req, res) => {
  try {
    const o = await tx(async c => {
      const { rows: [p] } = await c.query(`SELECT * FROM payments WHERE id=$1 AND status='review' FOR UPDATE`, [req.params.id]);
      if (!p) throw new Error('Payment is not awaiting review');
      const { rows: [o] } = await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [p.order_id]);
      if (!['pending', 'cancelled'].includes(o.status)) throw new Error('Order is already paid: refund this payment instead');
      if (o.status === 'cancelled') { // stock was released when it expired: take it back
        const { rows: items } = await c.query('SELECT * FROM order_items WHERE order_id=$1', [o.id]);
        for (const i of items) {
          const u = await c.query('UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock>=$2', [i.product_id, i.qty]);
          if (!u.rowCount) throw new Error(`Not enough stock for ${i.name}: refund instead`);
          await c.query(`INSERT INTO stock_movements(product_id,change,reason,order_id,user_id) VALUES($1,$2,'late payment matched',$3,$4)`,
            [i.product_id, -i.qty, o.id, req.user.id]);
        }
      }
      await c.query(`UPDATE orders SET status='paid' WHERE id=$1`, [o.id]);
      await c.query(`UPDATE payments SET status='paid', matched_by=$2, note=COALESCE(note,'')||' | matched by owner' WHERE id=$1`, [p.id, req.user.id]);
      return o;
    });
    track(o.id, 'paid', 'Payment confirmed by the owner');
    notify(o.user_id, 'Payment confirmed', `Order #${o.id} is confirmed`, `/order/${o.id}`);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// You refunded this payment outside the app
r.post('/payments/:id/resolve', async (req, res) => {
  const rows = await q(`UPDATE payments SET status='refunded', matched_by=$2, note=COALESCE(note,'')||' | refunded manually'
    WHERE id=$1 AND status='review' RETURNING id`, [req.params.id, req.user.id]);
  rows[0] ? res.json({ ok: true }) : res.status(400).json({ error: 'Payment is not awaiting review' });
});

r.get('/insights', async (req, res) => {
  const methods = await q(`SELECT method, COUNT(*)::int orders, SUM(amount)::int revenue FROM payments WHERE status='paid' GROUP BY 1 ORDER BY 3 DESC`);
  const coupons = await q(`SELECT coupon_code code, COUNT(*)::int orders, SUM(discount)::int discount FROM orders
    WHERE coupon_code IS NOT NULL AND status NOT IN ('pending','cancelled') GROUP BY 1 ORDER BY 2 DESC LIMIT 5`);
  const [stock] = await q(`SELECT COALESCE(SUM(price*stock),0)::int stock_value, (COUNT(*) FILTER (WHERE stock=0))::int out_of_stock,
    (COUNT(*) FILTER (WHERE stock BETWEEN 1 AND 5))::int low_stock FROM products WHERE active`);
  const [buyers] = await q(`SELECT (COUNT(*) FILTER (WHERE n>1))::int repeat, COUNT(*)::int total FROM
    (SELECT user_id, COUNT(*) n FROM orders WHERE status NOT IN ('pending','cancelled','refunded') GROUP BY 1) t`);
  res.json({ methods, coupons, stock, buyers });
});
export default r;