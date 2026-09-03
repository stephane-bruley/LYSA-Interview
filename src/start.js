/**
 * `npm start` — brings up the database container, runs the server in the
 * foreground, and tears the container back down on Ctrl-C.
 *
 * It does not create the schema. On an empty database it stops and tells you
 * to run `npm run db:reset`, because a start command that quietly writes to
 * your database is a start command you cannot trust: the day it runs against
 * something you cared about, it is too late.
 *
 * `npm run dev` skips the container entirely, so file watching does not cycle
 * it on every keystroke.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { startServer } from './server.js';
import { pool, waitForDatabase } from './db.js';
import { isEmpty } from '../db/reset.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_DATABASE = 'localhost:5433';

/**
 * Point DATABASE_URL at your own PostgreSQL and this script stays out of
 * Docker's way entirely — it would be rude to stop containers we did not start
 * for a database we are not using.
 */
const usesContainer =
  !process.env.DATABASE_URL || process.env.DATABASE_URL.includes(DEFAULT_DATABASE);

const compose = (...args) =>
  spawnSync('docker', ['compose', ...args], { cwd: root, stdio: 'inherit', shell: false });

function startDatabase() {
  console.log('\n  Starting the database container…');

  // --wait blocks until the healthcheck in docker-compose.yml passes, so the
  // first query below cannot race the container's startup.
  const up = compose('up', '-d', '--wait');

  if (up.error?.code === 'ENOENT') {
    throw new Error('docker was not found on the PATH. Install Docker Desktop and start it.');
  }
  if (up.status !== 0) {
    throw new Error('docker compose could not start the database. Is Docker Desktop running?');
  }
}

/**
 * Thrown rather than fixed. The container is deliberately left running: the
 * command we are about to suggest needs it.
 */
async function requireSchema() {
  if (!(await isEmpty())) return;

  throw new Error(
    'The database is empty — no schema.\n' +
      '  Run this once, then start again:\n\n' +
      '    npm run db:reset\n\n' +
      '  The database container is up, so it will work right away.'
  );
}

// ---------------------------------------------------------------- shutdown

let server;
let stopping = false;

async function shutdown(signal) {
  if (stopping) {
    // A second Ctrl-C means they want out now, not a tidy teardown.
    console.log('\n  Forcing exit.');
    process.exit(1);
  }
  stopping = true;

  console.log(`\n  ${signal} received, shutting down…`);

  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end().catch(() => {});

  if (usesContainer) {
    console.log('  Stopping the database container…');
    // Synchronous on purpose: the process must not exit before docker has
    // actually finished, or the container survives the Ctrl-C.
    compose('down');
  }

  console.log('  Done.\n');
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shutdown(signal);
  });
}

// -------------------------------------------------------------------- main

try {
  if (usesContainer) {
    startDatabase();
  } else {
    console.log(`\n  Using DATABASE_URL, leaving Docker alone.`);
  }

  await waitForDatabase();
  await requireSchema();
  server = await startServer();

  console.log('  Ctrl-C stops the server and the database container.\n');
} catch (err) {
  // The container stays up on purpose here: every fix we can suggest — loading
  // the schema, looking at the logs — needs a running database.
  console.error(`\n  ${err.message}\n`);
  await pool.end().catch(() => {});
  process.exit(1);
}
