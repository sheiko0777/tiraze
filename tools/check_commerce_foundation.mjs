import assert from 'node:assert/strict';
import { decimalToPiastres, piastresToDecimal, addPiastres } from '../packages/core/src/money.ts';
import { isCodAllowed } from '../packages/core/src/cod.ts';
import { quoteShipping } from '../packages/core/src/shipping.ts';
import { computeKashierSignature, verifyKashierSignature } from '../packages/core/src/kashier/signature.ts';

for (const amount of [0, 1, 99, 100, 999999, 1000000, 99999999999999]) {
  assert.equal(decimalToPiastres(piastresToDecimal(amount)), amount);
}
for (const invalid of ['-1', '1.001', '1e3', 'NaN']) assert.throws(() => decimalToPiastres(invalid));
assert.throws(() => addPiastres(Number.MAX_SAFE_INTEGER, 1));

const pkg = { skuId: 'review-only', weightG: 1000, lengthCm: 100, widthCm: 20, heightCm: 20 };
const table = {
  versionId: 'review-only',
  zones: { C: 'z' },
  rates: [{ zoneCode: 'z', maxWeightG: 2000, maxLongestCm: 200, feePiastres: 5000 }],
};
const shipping = quoteShipping(table, 'C', [pkg, pkg]);
assert.equal(shipping.ok, true);
assert.equal(shipping.feePiastres, 10000);
assert.equal(isCodAllowed(addPiastres(990000, shipping.feePiastres)), true);
assert.equal(isCodAllowed(addPiastres(990001, shipping.feePiastres)), false);
assert.equal(isCodAllowed(900000, 800000), false);
assert.equal(quoteShipping(table, 'UNKNOWN', [pkg]).ok, false);
assert.equal(quoteShipping(table, 'C', [{ ...pkg, weightG: 3000 }]).ok, false);
// Published Kashier verification vector, not a signature computed by this implementation.
// https://developers.kashier.io/docs/webhooks — illustrative key only, never a credential.
const payment = {
  amount: 1,
  channel: 'online | e-commerce',
  currency: 'EGP',
  kashierOrderId: '9ad06b17-755b-4e21-9774-aff3e2726ac9',
  merchantOrderId: '1653481557813',
  method: 'card',
  orderReference: 'TEST-ORD-38855',
  status: 'SUCCESS',
  transactionId: 'TX-249893963',
  transactionResponseCode: '00',
};
const signed = { ...payment, signatureKeys: Object.keys(payment).reverse() };
const expected = '9610477b2255b2a8ef84fd89adfaa5f1305ff9c20324205851890f1ea03109f4';
assert.equal(await computeKashierSignature(signed, '11111'), expected);
assert.equal(await verifyKashierSignature(signed, expected, '11111'), true);
assert.equal(await verifyKashierSignature({ ...signed, amount: 2 }, expected, '11111'), false);
assert.equal(await verifyKashierSignature(signed, expected, 'wrong-test-key'), false);
console.log('PASS: core money/COD/shipping and official Kashier signature vector plus tamper rejection. Not a live payment or checkout integration test.');
