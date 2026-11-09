// Promote an existing account to owner (admin).
// Usage (from the server folder):  npm run make-admin -- you@example.com
// The person must have signed up in the shop first.
import 'dotenv/config';
import { pool } from './db.js';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- you@example.com');
  process.exit(1);
}

try {
  const { rows } = await pool.query(
    `UPDATE users SET role='admin' WHERE email=$1 RETURNING id, name, email, role`, [email]);
  if (!rows.length) {
    console.error(`No account with email ${email}. Sign up in the shop first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${rows[0].name} <${rows[0].email}> is now an admin. Log out and back in to see the Owner dashboard.`);
  }
} catch (e) {
  console.error('Could not update the user:', e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
