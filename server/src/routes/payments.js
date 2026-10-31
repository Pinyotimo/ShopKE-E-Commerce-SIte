import { Router } from 'express';
import { q, tx } from '../db.js';
import { auth } from '../auth.js';
import { stkPush } from '../mpesa.js';
import { notify, notifyRole } from '../notify.js';
const r = Router();

r.post('/payments/mpesa', auth, async (req, res) => {
  const [o] = await q('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [req.body.orderId, req.user.id]);
  if (!o || o.status !== 'pending') return res.status(400).json({ error: 'Order not payable' });
  try {
    const d = await stkPush(o.phone, o.total, o.id);
    await q('INSERT INTO payments(order_id,amount,checkout_request_id) VALUES($1,$2,$3)', [o.id, o.total, d.CheckoutRequestID]);
    res.json({ message: 'Enter your M-Pesa PIN on your phone' });
  } catch (e) { res.status(502).json({ error: 'M-Pesa request failed', detail: e.response?.data }); }
});

r.post('/payments/mpesa/callback/:secret', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (req.params.secret !== process.env.CALLBACK_SECRET) return;
  try {
    const cb = req.body?.Body?.stkCallback; if (!cb) return;
    const [p] = await q('SELECT * FROM payments WHERE checkout_request_id=$1', [cb.CheckoutRequestID]);
    if (!p || p.status !== 'pending') return; // idempotent
    if (cb.ResultCode !== 0) return void await q(`UPDATE payments SET status='failed', raw=$2 WHERE id=$1`, [p.id, cb]);
    const m = Object.fromEntries((cb.CallbackMetadata?.Item || []).map(i => [i.Name, i.Value]));
    const ok = await tx(async c => {
      const paid = Number(m.Amount) >= p.amount;
      const upd = paid && (await c.query(`UPDATE orders SET status='paid' WHERE id=$1 AND status='pending'`, [p.order_id])).rowCount;
      // 'review' = underpaid or order already auto-cancelled
      await c.query(`UPDATE payments SET status=$2, mpesa_receipt=$3, raw=$4 WHERE id=$1`,
        [p.id, upd ? 'paid' : 'review', m.MpesaReceiptNumber, cb]);
      return !!upd;
    });
    const [o] = await q('SELECT user_id,total FROM orders WHERE id=$1', [p.order_id]);
    if (ok) {
      notify(o.user_id, 'Payment received', `Order #${p.order_id} is confirmed`, '/orders');
      notifyRole(['staff', 'admin'], `New paid order #${p.order_id}`, `KES ${o.total.toLocaleString()}`, '/staff');
    } else notifyRole(['admin'], 'Payment needs review', `Order #${p.order_id}`, '/admin/orders');
  } catch (e) { console.error('callback', e); }
});
export default r;