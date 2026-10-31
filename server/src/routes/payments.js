import { Router } from 'express';
import { q } from '../db.js';
import { auth } from '../auth.js';
import { stkPush } from '../mpesa.js';
import * as ps from '../paystack.js';
import { finishRefund, settle } from '../settle.js';
const r = Router();
const METHODS = ['mpesa', 'till', 'card', 'paystack'];

r.post('/payments/pay', auth, async (req, res) => {
  const { orderId, method } = req.body;
  if (!METHODS.includes(method)) return res.status(400).json({ error: 'Choose a payment method' });
  const [o] = await q('SELECT o.*, u.email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=$1 AND o.user_id=$2', [orderId, req.user.id]);
  if (!o || o.status !== 'pending') return res.status(400).json({ error: 'Order not payable' });
  try {
    if (method === 'mpesa' || method === 'till') {
      const d = await stkPush(o.phone, o.total, o.id, method === 'till');
      await q('INSERT INTO payments(order_id,method,amount,checkout_request_id) VALUES($1,$2,$3,$4)', [o.id, method, o.total, d.CheckoutRequestID]);
      return res.json({ kind: 'stk' });
    }
    const reference = `SK${o.id}-${Date.now().toString(36)}`;
    const d = await ps.initialize(o.email, o.total, reference, o.id, method);
    await q('INSERT INTO payments(order_id,method,amount,reference) VALUES($1,$2,$3,$4)', [o.id, method, o.total, reference]);
    res.json({ kind: 'redirect', url: d.authorization_url });
  } catch (e) { console.error('pay', e.response?.data || e.message); res.status(502).json({ error: 'Payment provider request failed' }); }
});

r.post('/payments/mpesa/callback/:secret', async (req, res) => {
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  if (req.params.secret !== process.env.CALLBACK_SECRET) return;
  try {
    const cb = req.body?.Body?.stkCallback; if (!cb) return;
    const [p] = await q('SELECT * FROM payments WHERE checkout_request_id=$1', [cb.CheckoutRequestID]);
    if (!p || p.status !== 'pending') return; // idempotent
    if (cb.ResultCode !== 0) return void await q(`UPDATE payments SET status='failed', raw=$2, note=$3 WHERE id=$1`, [p.id, cb, cb.ResultDesc]);
    const m = Object.fromEntries((cb.CallbackMetadata?.Item || []).map(i => [i.Name, i.Value]));
    await settle(p, { receipt: m.MpesaReceiptNumber, paidAmount: Number(m.Amount), raw: cb });
  } catch (e) { console.error('mpesa callback', e); }
});

async function settlePaystack(d) {
  const [p] = await q('SELECT * FROM payments WHERE reference=$1', [d.reference]);
  if (!p || p.status !== 'pending') return;
  await settle(p, { receipt: d.reference, paidAmount: d.currency === 'KES' ? Math.round(d.amount / 100) : NaN, raw: d, exact: true });
}

r.post('/payments/paystack/webhook', async (req, res) => {
  if (!req.raw || !ps.validSig(req.raw, req.headers['x-paystack-signature'])) return res.sendStatus(401);
  res.sendStatus(200);
  try {
    const { event, data } = req.body;
    if (event === 'charge.success') await settlePaystack(data);
    if (event === 'refund.processed' || event === 'refund.failed') {
      const [f] = await q(`SELECT f.* FROM refunds f JOIN payments p ON p.id=f.payment_id
        WHERE p.reference=$1 AND f.status='processing'`, [data.transaction_reference]);
      if (!f) return;
      if (event === 'refund.processed') await finishRefund(f);
      else await q(`UPDATE refunds SET status='failed' WHERE id=$1`, [f.id]);
    }
  } catch (e) { console.error('paystack webhook', e); }
});

// Customer returns from Paystack: confirm with the API instead of waiting for the webhook
r.post('/payments/paystack/verify', auth, async (req, res) => {
  const [p] = await q(`SELECT p.* FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.reference=$1 AND o.user_id=$2`, [String(req.body.reference), req.user.id]);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  if (p.status === 'pending') {
    const d = await ps.verify(p.reference).catch(() => null);
    if (d?.status === 'success') await settlePaystack(d);
  }
  const [o] = await q('SELECT status FROM orders WHERE id=$1', [p.order_id]);
  res.json({ order: o.status });
});
export default r;