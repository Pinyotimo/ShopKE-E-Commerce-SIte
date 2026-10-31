import { Router } from 'express';
import { q } from '../db.js';
import { auth } from '../auth.js';
import { notifyRole } from '../notify.js';
import { finishRefund } from '../settle.js';
const r = Router();

r.post('/refunds', auth, async (req, res) => {
  const { orderId, reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ error: 'Reason required' });
  const [o] = await q(`SELECT o.*, p.id pid FROM orders o
    JOIN payments p ON p.order_id=o.id AND p.status='paid' WHERE o.id=$1 AND o.user_id=$2`, [orderId, req.user.id]);
  if (!o) return res.status(404).json({ error: 'No paid order found' });
  if (!['paid', 'packed', 'out_for_delivery', 'delivered'].includes(o.status)) return res.status(400).json({ error: 'Order not refundable' });
  if (Date.now() - new Date(o.created_at) > 7 * 864e5) return res.status(400).json({ error: 'Refund window (7 days) passed' });
  const ex = await q(`SELECT 1 FROM refunds WHERE order_id=$1 AND status IN ('requested','processing','refunded')`, [o.id]);
  if (ex.length) return res.status(400).json({ error: 'Refund already requested' });
  const [f] = await q('INSERT INTO refunds(order_id,payment_id,amount,reason) VALUES($1,$2,$3,$4) RETURNING *', [o.id, o.pid, o.total, reason.trim()]);
  notifyRole(['admin'], `Refund requested: order #${o.id}`, reason.trim().slice(0, 120), '/admin/refunds');
  res.status(201).json(f);
});

r.post('/refunds/mpesa/result/:secret', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (req.params.secret !== process.env.CALLBACK_SECRET) return;
  try {
    const x = req.body?.Result; if (!x) return;
    const [f] = await q('SELECT * FROM refunds WHERE conversation_id=$1', [x.ConversationID]);
    if (!f || f.status !== 'processing') return;
    if (x.ResultCode !== 0) {
      await q(`UPDATE refunds SET status='failed' WHERE id=$1`, [f.id]);
      return void notifyRole(['admin'], `Refund reversal failed: order #${f.order_id}`, 'Retry from Refunds', '/admin/refunds');
    }
    await finishRefund(f);
  } catch (e) { console.error('refund result', e); }
});
r.post('/refunds/mpesa/timeout/:secret', (req, res) => res.json({ ResultCode: 0 }));
export default r;