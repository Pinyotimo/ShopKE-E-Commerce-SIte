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
r.get('/', async (req, res) => res.json(await q('SELECT * FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 30', [req.user.id])));
r.post('/read', async (req, res) => {
  await q('UPDATE notifications SET read=true WHERE user_id=$1 AND read=false', [req.user.id]);
  res.json({ ok: true });
});
export default r;