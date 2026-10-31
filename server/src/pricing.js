import { quote } from './delivery.js';

export const unit = p => (p.sale_price && (!p.sale_ends_at || new Date(p.sale_ends_at) > new Date()) ? p.sale_price : p.price);

export function couponCheck(cp, sub) {
  if (!cp || !cp.active) return 'Invalid coupon code';
  if (cp.expires_at && new Date(cp.expires_at) < new Date()) return 'Coupon has expired';
  if (cp.max_uses != null && cp.used >= cp.max_uses) return 'Coupon has been fully used';
  if (sub < cp.min_subtotal) return `Spend KES ${cp.min_subtotal.toLocaleString()} or more to use this coupon`;
  return null;
}
export const couponValue = (cp, sub) => Math.min(sub, cp.kind === 'percent' ? Math.floor((sub * cp.value) / 100) : cp.value);

// run(sql, params) -> rows. lock = 'FOR UPDATE' inside a transaction.
export async function price(run, items, lat, lng, code, lock = '') {
  const merged = new Map();
  for (const i of items || []) merged.set(+i.productId, (merged.get(+i.productId) || 0) + Math.floor(+i.qty));
  if (!merged.size) throw new Error('Cart is empty');
  const ps = await run(`SELECT * FROM products WHERE id=ANY($1) AND active ${lock}`, [[...merged.keys()]]);
  let sub = 0; const lines = [];
  for (const [id, n] of merged) {
    const p = ps.find(x => x.id === id);
    if (!p || !(n >= 1)) throw new Error('Invalid item');
    if (p.stock < n) throw new Error(`Only ${p.stock} of ${p.name} left`);
    const u = unit(p); sub += u * n; lines.push({ p, n, u });
  }
  let cp = null, discount = 0, couponError = null;
  if (code) {
    [cp] = await run(`SELECT * FROM coupons WHERE code=$1 ${lock}`, [String(code).trim().toUpperCase()]);
    couponError = couponCheck(cp, sub);
    if (couponError) cp = null; else discount = couponValue(cp, sub);
  }
  const d = typeof lat === 'number' && typeof lng === 'number' ? quote(lat, lng, sub - discount) : null;
  return { lines, sub, cp, discount, couponError, d, total: d?.ok ? sub - discount + d.fee : null };
}