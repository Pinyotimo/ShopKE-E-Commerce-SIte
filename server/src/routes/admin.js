import { Router } from 'express';
import { q } from '../db.js';
import { auth, admin } from '../auth.js';
import { reverse } from '../mpesa.js';
import { notify } from '../notify.js';
const r = Router();
r.use(auth, admin);

const OK = `status NOT IN ('pending','cancelled','refunded')`;
r.get('/analytics', async (req, res) => {
  const [totals] = await q(`SELECT
      COALESCE(SUM(total) FILTER (WHERE ${OK}),0)::int revenue,
      (COUNT(*) FILTER (WHERE ${OK}))::int orders,
      COALESCE(SUM(total) FILTER (WHERE status='refunded'),0)::int refunded,
      (SELECT COUNT(*) FROM users WHERE role='customer')::int customers,
      (SELECT COUNT(*) FROM products WHERE active AND stock<=5)::int low_stock
    FROM orders`);
  const daily = await q(`SELECT to_char(d,'DD Mon') day, COALESCE(SUM(o.total),0)::int revenue, COUNT(o.id)::int orders
    FROM generate_series(current_date-29, current_date, interval '1 day') d
    LEFT JOIN orders o ON o.created_at::date = d::date AND o.${OK}
    GROUP BY d ORDER BY d`);
  const status = await q('SELECT status, COUNT(*)::int n FROM orders GROUP BY status ORDER BY n DESC');
  const top = await q(`SELECT i.name, SUM(i.qty)::int units, SUM(i.qty*i.price)::int revenue
    FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.${OK}
    GROUP BY i.name ORDER BY revenue DESC LIMIT 5`);
  const category = await q(`SELECT COALESCE(p.category,'Other') category, SUM(i.qty*i.price)::int revenue
    FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN products p ON p.id=i.product_id WHERE o.${OK}
    GROUP BY 1 ORDER BY revenue DESC`);
  res.json({ totals, daily, status, top, category });
});

r.get('/refunds', async (req, res) => res.json(await q(
  `SELECT f.*, u.name customer FROM refunds f JOIN orders o ON o.id=f.order_id JOIN users u ON u.id=o.user_id ORDER BY f.id DESC`)));

r.post('/refunds/:id/approve', async (req, res) => {
  const [f] = await q(`UPDATE refunds SET status='processing' WHERE id=$1 AND status IN ('requested','failed') RETURNING *`, [req.params.id]);
  if (!f) return res.status(400).json({ error: 'Refund not approvable' });
  const [p] = await q('SELECT * FROM payments WHERE id=$1', [f.payment_id]);
  const [o] = await q('SELECT user_id FROM orders WHERE id=$1', [f.order_id]);
  try {
    const d = await reverse(p.mpesa_receipt, f.amount, f.order_id);
    await q('UPDATE refunds SET conversation_id=$2 WHERE id=$1', [f.id, d.ConversationID]);
    notify(o.user_id, 'Refund approved', `Order #${f.order_id}: reversal is being processed`, '/orders');
    res.json({ ok: true });
  } catch (e) {
    await q(`UPDATE refunds SET status='failed' WHERE id=$1`, [f.id]);
    res.status(502).json({ error: 'Reversal failed', detail: e.response?.data });
  }
});

r.post('/refunds/:id/reject', async (req, res) => {
  const [f] = await q(`UPDATE refunds SET status='rejected' WHERE id=$1 AND status='requested' RETURNING *`, [req.params.id]);
  if (!f) return res.status(400).json({ error: 'Not rejectable' });
  const [o] = await q('SELECT user_id FROM orders WHERE id=$1', [f.order_id]);
  notify(o.user_id, 'Refund declined', `Order #${f.order_id}`, '/orders');
  res.json(f);
});

r.get('/users', async (req, res) => res.json(await q(
  `SELECT id,name,email,role FROM users ORDER BY (role='admin') DESC, (role='staff') DESC, id DESC LIMIT 300`)));

r.patch('/users/:id/role', async (req, res) => {
  if (!['customer', 'staff'].includes(req.body.role)) return res.status(400).json({ error: 'Bad role' });
  const [u] = await q(`UPDATE users SET role=$2 WHERE id=$1 AND role<>'admin' RETURNING id,name,email,role`, [req.params.id, req.body.role]);
  if (!u) return res.status(400).json({ error: 'Cannot change this user' });
  notify(u.id, 'Your role changed', `You are now: ${u.role}`, u.role === 'staff' ? '/staff' : '/');
  res.json(u);
});
export default r;