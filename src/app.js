import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';

import { customers } from './routes/customers.js';
import { orders } from './routes/orders.js';
import { query } from './db.js';

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(publicDir));

  app.use('/api/customers', customers);
  app.use('/api/orders', orders);

  app.get('/api/products', async (_req, res) => {
    const { rows } = await query(
      'select id, sku, name, unit_price as "unitPrice" from products order by sku'
    );
    res.json(rows);
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'unknown endpoint' }));

  // Express 5 forwards rejected promises from async handlers here, so a failed
  // query answers with a 500 instead of leaving the request hanging.
  app.use((err, _req, res, _next) => {
    console.error('[api]', err);
    res.status(500).json({ error: err.message });
  });

  return app;
}
