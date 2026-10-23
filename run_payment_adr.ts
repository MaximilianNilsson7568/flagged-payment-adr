import { processPaymentEvent, renderAdrdiff } from './payment_policy.js';

const sample = {
  eventId: 'evt_9001',
  accountId: 'acct_0007',
  amountCents: 250000,
  currency: 'USD',
  riskScore: 41,
  cardCountry: 'US',
  memo: 'invoice payment'
};

async function main() {
  const decision = await processPaymentEvent(sample);
  console.log(renderAdrdiff(decision));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
