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
import adminRoutes from './routes/admin.js';
import notifications from './notify.js';

const app = express();
app.use(helmet(), cors({ origin: process.env.CLIENT_URL }), express.json());
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notifications);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', shop, payments, refunds);
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error' }); });

// Cancel unpaid orders after 30 min and restock
setInterval(() => tx(async c => {
  const { rows } = await c.query(`UPDATE orders SET status='cancelled'
    WHERE status='pending' AND created_at < now() - interval '30 minutes' RETURNING id`);
  for (const o of rows) await c.query(
    `UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.order_id=$1 AND i.product_id=p.id`, [o.id]);
}).catch(console.error), 60_000);

app.listen(process.env.PORT || 4000, () => console.log('API up'));