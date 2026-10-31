import { q, tx } from './db.js';
import { notify, notifyRole, track } from './notify.js';

// Matches a received payment against its order. Anything odd goes to 'review'.
export async function settle(p, { receipt, paidAmount, raw, exact = false }) {
  const match = exact ? paidAmount === p.amount : paidAmount >= p.amount;
  const ok = await tx(async c => {
    const u = match ? (await c.query(`UPDATE orders SET status='paid' WHERE id=$1 AND status='pending'`, [p.order_id])).rowCount : 0;
    const note = u ? null : match ? 'Order was no longer pending (cancelled, expired or already paid)'
      : `Amount mismatch: received KES ${paidAmount}, expected KES ${p.amount}`;
    await c.query(`UPDATE payments SET status=$2, mpesa_receipt=$3, paid_amount=$4, raw=$5, note=$6 WHERE id=$1`,
      [p.id, u ? 'paid' : 'review', receipt, Number.isFinite(paidAmount) ? paidAmount : null, raw, note]);
    return !!u;
  });
  const [o] = await q('SELECT user_id,total FROM orders WHERE id=$1', [p.order_id]);
  if (ok) {
    track(p.order_id, 'paid', `Paid via ${p.method} (${receipt})`);
    notify(o.user_id, 'Payment received', `Order #${p.order_id} is confirmed`, `/order/${p.order_id}`);
    notifyRole(['staff', 'admin'], `New paid order #${p.order_id}`, `KES ${o.total.toLocaleString()}`, '/staff');
  } else notifyRole(['admin'], 'Payment needs review', `Order #${p.order_id}: open Payments`, '/admin/payments');
  return ok;
}

export async function finishRefund(f) {
  const uid = await tx(async c => {
    const { rows: [o] } = await c.query('SELECT status,user_id FROM orders WHERE id=$1', [f.order_id]);
    await c.query(`UPDATE refunds SET status='refunded' WHERE id=$1`, [f.id]);
    await c.query(`UPDATE payments SET status='refunded' WHERE id=$1`, [f.payment_id]);
    await c.query(`UPDATE orders SET status='refunded' WHERE id=$1`, [f.order_id]);
    if (['paid', 'packed'].includes(o.status)) { // goods never left: restock
      await c.query(`INSERT INTO stock_movements(product_id,change,reason,order_id)
        SELECT product_id, qty, 'refund restock', $1 FROM order_items WHERE order_id=$1 AND product_id IS NOT NULL`, [f.order_id]);
      await c.query(`UPDATE products p SET stock=p.stock+i.qty FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`, [f.order_id]);
    }
    return o.user_id;
  });
  track(f.order_id, 'refunded', `KES ${f.amount.toLocaleString()} refunded`);
  notify(uid, 'Refund completed', `KES ${f.amount.toLocaleString()} returned (order #${f.order_id})`, `/order/${f.order_id}`);
}