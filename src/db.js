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
