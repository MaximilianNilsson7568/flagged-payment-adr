import test from 'node:test';
import assert from 'node:assert/strict';
import { decidePayment, paymentEventSchema } from './payment_policy.js';

test('high-risk payment is held and audit-notified', () => {
  const event = paymentEventSchema.parse({
    eventId: 'evt_1001',
    accountId: 'acct_2002',
    amountCents: 12000,
    currency: 'USD',
    riskScore: 92,
    cardCountry: 'US'
  });

  const decision = decidePayment(event, true);

  assert.equal(decision.action, 'hold_for_review');
  assert.equal(decision.notificationChannel, 'audit_log');
  assert.deepEqual(decision.reasons, ['high risk score']);
});
