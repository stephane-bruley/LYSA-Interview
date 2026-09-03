import pg from 'pg';

const { Pool, types } = pg;

/**
 * node-postgres hands back bigint and numeric as strings, to avoid losing
 * precision on values JavaScript cannot represent. Our counts and rates are
 * small and we do arithmetic on them, so we parse them here, once, rather than
 * scattering Number() calls across the code.
 */
types.setTypeParser(types.builtins.INT8, (value) => Number(value));
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgres://lysa:lysa@localhost:5433/lysa',
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/**
 * Waits until the database actually answers a query.
 *
 * A passing healthcheck is not enough on a first-ever start: the PostgreSQL
 * entrypoint runs initdb against the empty volume, serves on a temporary
 * socket while it loads the init scripts, then shuts that down and starts the
 * real server. `pg_isready` can succeed during that window, and the query that
 * follows dies with "Connection terminated unexpectedly". So we retry.
 */
export async function waitForDatabase({ attempts = 40, delayMs = 500 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await pool.query('select 1');
      return;
    } catch (err) {
      if (attempt >= attempts) {
        throw new Error(`the database never answered after ${attempt} tries: ${err.message}`);
      }
      if (attempt === 2) console.log('  Waiting for PostgreSQL to finish starting up…');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
