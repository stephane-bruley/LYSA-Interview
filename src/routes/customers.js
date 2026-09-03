import { Router } from 'express';

import { query } from '../db.js';

export const customers = Router();

const SELECT = `
  select c.id,
         c.name,
         c.email,
         c.contract_discount_rate as "contractDiscountRate",
         c.archived,
         c.created_at as "createdAt",
         count(o.id) as "orderCount",
         max(o.created_at) as "lastOrderAt"
    from customers c
    left join orders o on o.customer_id = c.id
`;

function validate(body, { partial = false } = {}) {
  const errors = [];
  const has = (field) => body[field] !== undefined;

  if ((!partial || has('name')) && !String(body.name || '').trim()) {
    errors.push('name is required');
  }
  if ((!partial || has('email')) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email || '')) {
    errors.push('a valid email is required');
  }
  if (has('contractDiscountRate')) {
    const rate = Number(body.contractDiscountRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 20) {
      errors.push('contractDiscountRate must be between 0 and 20');
    }
  }
  return errors;
}

customers.get('/', async (req, res) => {
  const search = `%${req.query.search || ''}%`;
  const includeArchived = req.query.includeArchived === 'true';

  const { rows } = await query(
    `${SELECT}
      where (c.name ilike $1 or c.email ilike $1)
        and ($2 or not c.archived)
      group by c.id
      order by c.name`,
    [search, includeArchived]
  );

  res.json(rows);
});

customers.get('/:id', async (req, res) => {
  const { rows } = await query(`${SELECT} where c.id = $1 group by c.id`, [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'customer not found' });
  res.json(rows[0]);
});

customers.post('/', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const { rows } = await query(
    `insert into customers (name, email, contract_discount_rate)
     values ($1, $2, $3)
     returning id`,
    [req.body.name.trim(), req.body.email.trim(), req.body.contractDiscountRate ?? 0]
  );

  res.status(201).json({ id: rows[0].id });
});

customers.put('/:id', async (req, res) => {
  const errors = validate(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const { rowCount } = await query(
    `update customers
        set name = coalesce($2, name),
            email = coalesce($3, email),
            contract_discount_rate = coalesce($4, contract_discount_rate),
            archived = coalesce($5, archived)
      where id = $1`,
    [
      req.params.id,
      req.body.name?.trim() ?? null,
      req.body.email?.trim() ?? null,
      req.body.contractDiscountRate ?? null,
      req.body.archived ?? null,
    ]
  );

  if (rowCount === 0) return res.status(404).json({ error: 'customer not found' });
  res.json({ ok: true });
});

customers.delete('/:id', async (req, res) => {
  const { rows } = await query('select count(*) as count from orders where customer_id = $1', [
    req.params.id,
  ]);

  if (rows[0].count > 0) {
    return res.status(409).json({
      error: `this customer has ${rows[0].count} order(s) and cannot be deleted — archive it instead`,
    });
  }

  const { rowCount } = await query('delete from customers where id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'customer not found' });
  res.json({ ok: true });
});
