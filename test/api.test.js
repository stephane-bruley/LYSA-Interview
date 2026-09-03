/**
 * These tests hit the real database, and they expect the demo data. The
 * simplest way to have both is to leave `npm start` running in another
 * terminal.
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';
import { pool } from '../src/db.js';
import { isEmpty } from '../db/reset.js';

let base;
let server;

before(async () => {
  // Without this, a fresh clone fails every test below with an opaque
  // "relation does not exist", which says nothing about what to do next.
  if (await isEmpty()) {
    throw new Error('the database is empty — run `npm run db:reset` first');
  }

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const call = async (method, path, body) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
};

test('the customer list hides archived customers by default', async () => {
  const visible = await call('GET', '/api/customers');
  assert.equal(visible.status, 200);
  assert.ok(visible.body.length > 0);
  assert.ok(visible.body.every((customer) => customer.archived === false));

  const all = await call('GET', '/api/customers?includeArchived=true');
  assert.ok(all.body.length > visible.body.length, 'the demo data has an archived customer');
});

test('search matches on name and email', async () => {
  const byName = await call('GET', '/api/customers?search=Mekong');
  assert.equal(byName.body.length, 1);
  assert.equal(byName.body[0].name, 'Mekong Industrial');

  const byEmail = await call('GET', '/api/customers?search=hanoisteel');
  assert.equal(byEmail.body[0].name, 'Hanoi Steel JSC');
});

test('a customer can be created, updated and deleted', async () => {
  const email = `test-${Date.now()}@example.com`;

  const created = await call('POST', '/api/customers', {
    name: 'Test Co',
    email,
    contractDiscountRate: 5,
  });
  assert.equal(created.status, 201);
  const { id } = created.body;

  const updated = await call('PUT', `/api/customers/${id}`, { name: 'Test Co Renamed' });
  assert.equal(updated.status, 200);

  const fetched = await call('GET', `/api/customers/${id}`);
  assert.equal(fetched.body.name, 'Test Co Renamed');
  assert.equal(fetched.body.contractDiscountRate, 5);
  assert.equal(fetched.body.orderCount, 0);

  const deleted = await call('DELETE', `/api/customers/${id}`);
  assert.equal(deleted.status, 200);

  const gone = await call('GET', `/api/customers/${id}`);
  assert.equal(gone.status, 404);
});

test('an invalid customer is refused', async () => {
  const res = await call('POST', '/api/customers', { name: '', email: 'not-an-email' });
  assert.equal(res.status, 400);
});

test('a customer with orders cannot be deleted', async () => {
  const res = await call('DELETE', '/api/customers/1');
  assert.equal(res.status, 409);
  assert.match(res.body.error, /archive it instead/);
});

test('an order carries its lines and its totals', async () => {
  const list = await call('GET', '/api/orders');
  const order = list.body.find((candidate) => candidate.reference === 'SO-1043');
  assert.ok(order, 'SO-1043 is in the demo data');

  const detail = await call('GET', `/api/orders/${order.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.customerName, 'Hanoi Steel JSC');
  assert.equal(detail.body.lines.length, 1);
  assert.equal(detail.body.lines[0].quantity, 20);

  for (const key of ['subtotal', 'volumeDiscount', 'contractDiscount', 'vat', 'total']) {
    assert.equal(typeof detail.body.totals[key], 'number', `${key} is a number`);
  }
});

test('an unknown order is a 404', async () => {
  const res = await call('GET', '/api/orders/999999');
  assert.equal(res.status, 404);
});
