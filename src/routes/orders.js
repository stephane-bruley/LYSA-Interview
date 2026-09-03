import { Router } from 'express';

import { query } from '../db.js';
import { orderTotal } from '../pricing.js';

export const orders = Router();

async function linesOf(orderId) {
  const { rows } = await query(
    `select l.id,
            l.quantity,
            l.unit_price as "unitPrice",
            p.sku,
            p.name
       from order_lines l
       join products p on p.id = l.product_id
      where l.order_id = $1
      order by l.id`,
    [orderId]
  );
  return rows;
}

orders.get('/', async (req, res) => {
  const { rows } = await query(
    `select o.id,
            o.reference,
            o.status,
            o.created_at as "createdAt",
            c.id as "customerId",
            c.name as "customerName",
            c.contract_discount_rate as "contractDiscountRate"
       from orders o
       join customers c on c.id = o.customer_id
      where ($1::int is null or o.customer_id = $1)
      order by o.created_at desc`,
    [req.query.customerId ? Number(req.query.customerId) : null]
  );

  // One query for every line of the listed orders, then group in memory:
  // cheaper and simpler than one query per order.
  const ids = rows.map((order) => order.id);
  const lines = ids.length
    ? (
        await query(
          `select order_id as "orderId", quantity, unit_price as "unitPrice"
             from order_lines
            where order_id = any($1::int[])`,
          [ids]
        )
      ).rows
    : [];

  const byOrder = new Map(ids.map((id) => [id, []]));
  for (const line of lines) byOrder.get(line.orderId).push(line);

  res.json(
    rows.map((order) => ({
      ...order,
      totals: orderTotal(byOrder.get(order.id), order),
    }))
  );
});

orders.get('/:id', async (req, res) => {
  const { rows } = await query(
    `select o.id,
            o.reference,
            o.status,
            o.created_at as "createdAt",
            c.id as "customerId",
            c.name as "customerName",
            c.email as "customerEmail",
            c.contract_discount_rate as "contractDiscountRate"
       from orders o
       join customers c on c.id = o.customer_id
      where o.id = $1`,
    [req.params.id]
  );

  if (rows.length === 0) return res.status(404).json({ error: 'order not found' });

  const order = rows[0];
  const lines = await linesOf(order.id);

  res.json({ ...order, lines, totals: orderTotal(lines, order) });
});
