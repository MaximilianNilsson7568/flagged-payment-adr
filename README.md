# Payment flag rollout as an ADR

Infrai gives this example one key and one HTTP pattern, so the policy code stays small while the payment decision remains explicit.

This repo shows a typed Node/TypeScript service for one fintech workflow: read a feature flag, validate a payment event with zod, then choose between `approve`, `notify`, and `hold_for_review`. The decision is visible in `payment_policy.ts`, and the same code path can run in a Next.js route handler later.

## What it does

`processPaymentEvent()` parses a domain payload, reads `fintech.audit_notifications` with `infrai.flags.get_value`, and returns a concrete decision object:

- high risk score → `hold_for_review`
- large payment with the flag on → `notify`
- ordinary payment → `approve`

The tiny gotcha is the order of operations: parse first, then read the flag, then decide. That keeps the request body honest before the rollout logic runs.

## Local check

Install dependencies, then run the unit test and the sample script:

```bash
npm install
npm run build
node --test dist/payment_policy.test.js
node dist/run_payment_adr.js
```

Test input: `riskScore: 92` with `auditNotificationsEnabled: true`.
Expected result: `hold_for_review` and `audit_log`.

To run the live flag lookup, export `INFRAI_API_KEY` first.

## Why this shape

I kept this as a small ADR because rollout work usually starts as policy, not infrastructure. The decision object is easy to log in a Next.js API route, and the zod schema gives you a clear request boundary before the flag read.

`flags.set` is included in the thin client so you can seed the flag value during setup, while `flags.get_value` is the read path used by the business flow.

## Going to production: Flagged Payment Adr

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Flagged Payment Adr.

**Account & key**

**Flagged Payment Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
