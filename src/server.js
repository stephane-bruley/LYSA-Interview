import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createApp } from './app.js';
import { pool } from './db.js';

const PORT = Number(process.env.PORT || 4000);

/**
 * Starts the HTTP server and resolves once it is listening. It assumes the
 * database is already reachable — `npm start` (src/start.js) takes care of
 * that, `npm run dev` expects you to have run `npm run db:up` yourself.
 */
export async function startServer() {
  await pool.query('select 1');

  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`\n  LYSA orders — http://localhost:${PORT}\n`);
      resolve(server);
    });
  });
}

const runDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (runDirectly) {
  try {
    await startServer();
  } catch (err) {
    console.error(`\n  Cannot reach the database: ${err.message}`);
    console.error('  Start it with: npm run db:up && npm run db:reset');
    console.error('  Or just use: npm start\n');
    process.exit(1);
  }
}
