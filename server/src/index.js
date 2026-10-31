import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { tx } from './db.js';
import authRoutes from './auth.js';
import shop from './routes/shop.js';
import payments from './routes/payments.js';
import refunds from './routes/refunds.js';
import staffRoutes from './routes/staff.js';
import stockRoutes from './routes/stock.js';
import adminRoutes from './routes/admin.js';
import finance from './routes/finance.js';
import coupons from './routes/coupons.js';
import notifications from './notify.js';

const app = express();
// keep the raw body: Paystack signs it
app.use(helmet(), cors({ origin: process.env.CLIENT_URL }), express.json({ verify: (req, res, buf) => { req.raw = buf; } }));
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notifications);
app.use('/api/staff', staffRoutes, stockRoutes);
app.use('/api/admin', adminRoutes, finance, coupons);
app.use('/api', shop, payments, refunds);
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

// Cancel unpaid orders after 30 min: restock, free the coupon use, log it
setInterval(() => tx(async c => {
  const { rows } = await c.query(`UPDATE orders SET status='cancelled'
    WHERE status='pending' AND created_at < now() - interval '30 minutes' RETURNING id, coupon_code`);
  for (const o of rows) {
    await c.query(`INSERT INTO stock_movements(product_id,change,reason,order_id)
      SELECT product_id, qty, 'order expired', $1 FROM order_items WHERE order_id=$1 AND product_id IS NOT NULL`, [o.id]);
    await c.query(`UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`, [o.id]);
    if (o.coupon_code) await c.query('UPDATE coupons SET used=GREATEST(used-1,0) WHERE code=$1', [o.coupon_code]);
    await c.query(`INSERT INTO order_events(order_id,status,note) VALUES($1,'cancelled','Not paid within 30 minutes')`, [o.id]);
  }
}).catch(console.error), 60_000);

app.listen(process.env.PORT || 4000, () => console.log('API up'));