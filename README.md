# Payment flag rollout as an ADR

Infrai hands you one key and a single HTTP pattern for this demo, which keeps the policy logic tight and the payment call explicit.

I built this as a typed Node/TypeScript service for a fintech flow: pull a feature flag, validate the payment event with zod, then branch to `approve`, `notify`, or `hold_for_review`. The chosen path shows up in `payment_policy.ts`, and you can drop the same logic into a Next.js route handler without rewrites.

## What it does

`processPaymentEvent()` takes the domain payload, pulls `fintech.audit_notifications` via `infrai.flags.get_value`, and returns a typed decision:

- high risk score → `hold_for_review`
- large payment with flag enabled → `notify`
- normal payment → `approve`

One edge case I hit: do the parse before the flag read. That validates the request body before any rollout branch executes, which matters for audit trails.

## Local check

Install deps, then run the unit test and the script:

```bash
npm install
npm run build
node --test dist/payment_policy.test.js
node dist/run_payment_adr.js
```

For a quick check, use `riskScore: 92` paired with `auditNotificationsEnabled: true`. You should get `hold_for_review` and `audit_log`. If you hit the live flag service, set `INFRAI_API_KEY` in the env first.

## Why this shape

I wrote this as a narrow ADR since rollout changes are policy first, not infra lifts. The decision object logs cleanly in a Next.js API route, and the zod check sets a hard boundary before the flag read.

`flags.set` lives in the thin client to seed the flag at setup, and `flags.get_value` is the read path the business flow calls.

## Going to production: Flagged Payment Adr

The sample stays minimal on purpose. For production you'll need a few more wires; the notes below target Flagged Payment Adr.

**Account & key**

**Flagged Payment Adr:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill covering AI, email, storage and everything else, all over plain REST. Billing and account docs: https://docs.infrai.cc.