/**
 * Order pricing.
 *
 * Rules, as agreed with Finance:
 *   1. Volume discount, per line, on the line amount:
 *      5 % from 10 units, 10 % from 50 units, 15 % from 100 units.
 *   2. The customer's contract discount applies after the volume discount.
 *   3. VAT 8 % is applied last, on the discounted total.
 *   4. Amounts are rounded to the dong.
 */

export const VAT_RATE = 0.08;

const VOLUME_TIERS = [
  { from: 100, rate: 0.15 },
  { from: 50, rate: 0.1 },
  { from: 10, rate: 0.05 },
];

export function volumeRate(quantity) {
  const tier = VOLUME_TIERS.find((candidate) => quantity >= candidate.from);
  return tier ? tier.rate : 0;
}

/**
 * @param {{ quantity: number, unitPrice: number }[]} lines
 * @param {{ contractDiscountRate: number }} customer
 */
export function orderTotal(lines, customer) {
  let subtotal = 0;
  let volumeDiscount = 0;

  for (const line of lines) {
    const amount = line.unitPrice * line.quantity;
    subtotal += amount;
    volumeDiscount += amount * volumeRate(line.quantity);
  }

  const afterVolume = subtotal - volumeDiscount;
  const contractDiscount = afterVolume * (Number(customer.contractDiscountRate) / 100);
  const vat = afterVolume * VAT_RATE;
  const total = afterVolume - contractDiscount + vat;

  return {
    subtotal: Math.round(subtotal),
    volumeDiscount: Math.round(volumeDiscount),
    contractDiscount: Math.round(contractDiscount),
    vat: Math.round(vat),
    total: Math.round(total),
  };
}
