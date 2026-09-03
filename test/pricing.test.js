import test from 'node:test';
import assert from 'node:assert/strict';

import { orderTotal, volumeRate } from '../src/pricing.js';

const noContract = { contractDiscountRate: 0 };

test('volume tiers follow the agreed thresholds', () => {
  assert.equal(volumeRate(1), 0);
  assert.equal(volumeRate(9), 0);
  assert.equal(volumeRate(10), 0.05);
  assert.equal(volumeRate(49), 0.05);
  assert.equal(volumeRate(50), 0.1);
  assert.equal(volumeRate(99), 0.1);
  assert.equal(volumeRate(100), 0.15);
  assert.equal(volumeRate(1000), 0.15);
});

test('an empty order costs nothing', () => {
  const totals = orderTotal([], noContract);
  assert.deepEqual(totals, {
    subtotal: 0,
    volumeDiscount: 0,
    contractDiscount: 0,
    vat: 0,
    total: 0,
  });
});

test('below the first tier, only VAT is added', () => {
  const totals = orderTotal([{ quantity: 5, unitPrice: 100000 }], noContract);

  assert.equal(totals.subtotal, 500000);
  assert.equal(totals.volumeDiscount, 0);
  assert.equal(totals.vat, 40000);
  assert.equal(totals.total, 540000);
});

test('the volume discount applies line by line, not on the order', () => {
  // 60 units earns 10 %, the 5-unit line earns nothing, even though the
  // order as a whole is above the first threshold.
  const totals = orderTotal(
    [
      { quantity: 60, unitPrice: 45000 },
      { quantity: 5, unitPrice: 12000 },
    ],
    noContract
  );

  assert.equal(totals.subtotal, 2760000);
  assert.equal(totals.volumeDiscount, 270000);
  assert.equal(totals.total, 2689200);
});

test('the top tier applies from 100 units', () => {
  const totals = orderTotal([{ quantity: 100, unitPrice: 100000 }], noContract);

  assert.equal(totals.volumeDiscount, 1500000);
  assert.equal(totals.total, 9180000);
});
