import { Router } from 'express';
import { q } from './db.js';
import { auth } from './auth.js';

export const notify = (userId, title, body = '', link = null) =>
  q('INSERT INTO notifications(user_id,title,body,link) VALUES($1,$2,$3,$4)', [userId, title, body, link]).catch(console.error);
export const notifyRole = (roles, title, body = '', link = null) =>
  q('INSERT INTO notifications(user_id,title,body,link) SELECT id,$2,$3,$4 FROM users WHERE role=ANY($1)',
    [roles, title, body, link]).catch(console.error);

const r = Router();
r.use(auth);
// ?limit=N (1-200, default 30) so the notifications page can show more history than the bell
r.get('/', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 200);
  res.json(await q('SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT $2', [req.user.id, limit]));
});
r.post('/read', async (req, res) => {
  await q('UPDATE notifications SET read=true WHERE user_id=$1 AND read=false', [req.user.id]);
  res.json({ ok: true });
});
r.delete('/:id', async (req, res) => {
  await q('DELETE FROM notifications WHERE id=$1 AND user_id=$2', [+req.params.id || 0, req.user.id]);
  res.json({ ok: true });
});
r.delete('/', async (req, res) => {
  await q('DELETE FROM notifications WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
});

export const track = (orderId, status, note = '') =>
  q('INSERT INTO order_events(order_id,status,note) VALUES($1,$2,$3)', [orderId, status, note]).catch(console.error);

export default r;