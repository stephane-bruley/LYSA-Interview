/**
 * Drops everything, recreates the schema and loads the demo data.
 *
 *   npm run db:reset
 */
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../src/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name), 'utf8');

/** Is the schema there at all? Used by `npm start` to bootstrap a fresh clone. */
export async function isEmpty() {
  const { rows } = await pool.query("select to_regclass('public.customers') as table");
  return rows[0].table === null;
}

export async function reset() {
  await pool.query(read('schema.sql'));
  console.log('  schema created');

  await pool.query(read('seed.sql'));

  const { rows } = await pool.query(
    'select (select count(*) from customers) as customers, (select count(*) from orders) as orders'
  );
  console.log(`  demo data loaded — ${rows[0].customers} customers, ${rows[0].orders} orders`);
}

const runDirectly =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (runDirectly) {
  try {
    await reset();
  } catch (err) {
    console.error('\nreset failed:', err.message);
    console.error('Is the database up? Try: npm run db:up\n');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
