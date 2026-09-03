/**
 * Drops everything, recreates the schema and loads the demo data.
 *
 *   npm run db:reset
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool } from '../src/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (name) => readFileSync(join(here, name), 'utf8');

try {
  await pool.query(read('schema.sql'));
  console.log('schema created');

  await pool.query(read('seed.sql'));
  console.log('demo data loaded');

  const { rows } = await pool.query(
    'select (select count(*) from customers) as customers, (select count(*) from orders) as orders'
  );
  console.log(`${rows[0].customers} customers, ${rows[0].orders} orders`);
} catch (err) {
  console.error('\nreset failed:', err.message);
  console.error('Is the database up? Try: npm run db:up\n');
  process.exitCode = 1;
} finally {
  await pool.end();
}
