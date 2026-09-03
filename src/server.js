import { createApp } from './app.js';
import { pool } from './db.js';

// 4000 rather than 3000: another application already holds 3000 on the
// machine this runs on. Override with PORT if you need something else.
const PORT = Number(process.env.PORT || 4000);

try {
  await pool.query('select 1');
} catch (err) {
  console.error(`\n  Cannot reach the database: ${err.message}`);
  console.error('  Start it with: npm run db:up && npm run db:reset\n');
  process.exit(1);
}

createApp().listen(PORT, () => {
  console.log(`\n  LYSA orders — http://localhost:${PORT}\n`);
});
