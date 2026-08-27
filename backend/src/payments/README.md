# Payments module

Payment domain model, initiation, confirmation, reconciliation, and refunds
for the booking platform. This module is built incrementally across a
payment track of issues (see `payment-state-machine.ts` for the canonical
list of legal state transitions — that file, not this README, is the source
of truth if the two ever disagree).

## Status lifecycle

`INITIATED → AWAITING_CONFIRMATION → CONFIRMED → (PARTIALLY_REFUNDED →) REFUNDED`

Off that happy path:

- `INITIATED → FAILED | EXPIRED`
- `AWAITING_CONFIRMATION → FAILED | EXPIRED | MANUAL_REVIEW`
- `CONFIRMED → DISPUTED`
- `DISPUTED → REFUNDED`
- `MANUAL_REVIEW → CONFIRMED | FAILED | VOIDED`

## Failure taxonomy (issue #1572)

`Payment#failureReason` records **why** a payment ended up `FAILED` or
`EXPIRED` — first-class enum data, not free text (`payment-failure-reason.enum.ts`):

| Reason           | Meaning                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| `DECLINED`        | The provider explicitly rejected the charge.                            |
| `EXPIRED`         | No confirmation (webhook or reconciliation) arrived within the TTL.     |
| `PROVIDER_ERROR`  | Talking to the provider itself failed (5xx/timeout) — not a verdict.    |
| `ABANDONED`       | The payment never progressed past `INITIATED` before expiring.         |

## Reconciliation engine

`ReconciliationService` runs on a schedule (`@Cron`, every 5 minutes by
default) and does two things:

1. **Expiry sweep** — `INITIATED`/`AWAITING_CONFIRMATION` payments past
   `Payment#expiresAt` become `EXPIRED` (`ABANDONED` vs `EXPIRED` reason
   depending on which state they expired from).
2. **Reconciliation** — every `AWAITING_CONFIRMATION` payment old enough
   (`PAYMENT_RECONCILE_DUE_AFTER_MINUTES`) and due for its next poll (an
   exponential backoff schedule per payment — see
   `PAYMENT_RECONCILE_BACKOFF_*`) is re-verified directly against the
   provider, reusing the same `verifyByReference` call and the same
   idempotent `PaymentConfirmationService.apply` path the webhook and
   verify-on-return flows use. A payment resolved this way can never be
   double-applied, and re-running the job is always safe.

A payment still unresolved after `PAYMENT_MANUAL_REVIEW_AFTER_HOURS`
escalates to `MANUAL_REVIEW` — **but only on a reconciliation pass where the
provider was actually reachable**. A provider-side outage (every verify
call in a batch throwing/timing out) never by itself escalates anything —
`Payment#providerErrorStreak` tracks consecutive unreachable attempts
separately from the age-based threshold, specifically so one bad run can't
mass-flag every in-flight payment.

### Admin recovery actions (`PaymentsAdminController`, `ADMIN` role only)

- `GET /payments/admin/manual-review` — the review queue, oldest first.
- `GET /payments/admin/metrics` — manual-review queue depth + alert status.
- `POST /payments/admin/:id/force-reconcile` — reconcile one payment now,
  bypassing the backoff schedule.
- `POST /payments/admin/:id/resolve-manually` — `{ resolution, reason }`,
  reason required and audited via `Payment#manualReviewReason`.
- `POST /payments/admin/:id/void` — `{ reason }`, closes a payment out
  without resolving it `CONFIRMED`/`FAILED`.
- `POST /payments/admin/:id/refunds` — `{ amount, reason }`, see below.

## Refunds (partial-outcome support)

A `Payment`'s refunded amount is always `SUM(payment_refunds.amount)` for
that payment — never a single boolean — so multiple partial refunds can
accumulate against one payment (`RefundsService`, `refund.entity.ts`).

`RefundsService.requestRefund` locks the payment row for the duration of
the check-and-insert (`pessimistic_write`), so two refund requests that
would together exceed the captured amount can never both succeed: the
loser gets a `409 Conflict`, not a corrupted ledger. The payment's status
moves to `PARTIALLY_REFUNDED` or `REFUNDED` depending on whether the
refunded total has reached the captured amount. Provider-side execution of
the refund happens *after* the ledger commits (best-effort, retried via
`utils/retry-with-backoff.ts`) — the ledger, not the provider call, is the
source of truth for "was this refund accepted."

## Retry/backoff utility

`utils/retry-with-backoff.ts` is a small, generic, independently-tested
exponential-backoff-with-jitter helper for our own outbound provider calls
— capped attempts, and an optional `isRetryable` predicate so a terminal
error (4xx) fails fast instead of burning the full attempt budget. Used by
`RefundsService`'s post-commit provider refund call.

## Metrics & alerting

`ReconciliationService.getMetrics()` reports the manual-review queue depth
and whether it exceeds `PAYMENT_MANUAL_REVIEW_ALERT_THRESHOLD`; the
scheduled job logs a `WARN`-level alert when it does. This is a
log-based signal by design — this module doesn't assume any particular
metrics/observability backend is wired up yet.

## Webhook payload contract

Every payment rail adapter maps its provider-specific confirmation event
into one **normalized** payload before the confirmation service consumes it.
The shape below is the contract (BE-137); `src/webhook-contract.ts` is the
machine-checkable source of truth, and every parsed webhook is validated
against it before any `Payment` state is touched — a wrong-shaped event is
rejected with a clear `400 Bad Request`, never silently mishandled.

### Contract version

`v1.0` — returned on every successful webhook response as `contractVersion`
and available as `PAYMENT_WEBHOOK_CONTRACT_VERSION` in
`src/webhook-contract.ts`. Bump this when a future issue makes a
**breaking** change to the normalized shape.

### Normalized payload

```json
{
  "providerReference": "provider_1234",
  "outcome": "confirmed"
}
```

| Field              | Type                                  | Required | Notes                                                       |
| ------------------ | ------------------------------------- | -------- | ----------------------------------------------------------- |
| `providerReference`| string                                | yes      | The provider's id for the payment we initiated. Non-blank.   |
| `outcome`          | `"confirmed" \| "failed" \| "pending"`| yes      | Terminal/current verdict to apply to the payment.            |

### Transport & processing rules

1. **Transport authenticity** — each rail has a dedicated controller
   (`/payments/webhooks/<rail>`) that authenticates the caller at the
   transport level (the sandbox rail uses an HMAC-SHA256 signature over the
   raw body, secret `PAYMENT_WEBHOOK_SECRET`). A bad signature is rejected
   with `401` before any parsing.
2. **Per-rail mapping** — the rail adapter's `parseWebhookPayload(rawBody)`
   maps the provider's native event fields into the normalized shape, so
   provider-specific field names/layouts never leak past the adapter.
3. **Contract validation** — the controller then runs
   `validateWebhookPayload` on the normalized payload. Malformed/missing
   fields → `400` with a field-specific message (logged as
   `malformed_payload`).
4. **Idempotency** — `PaymentConfirmationService.apply` looks the payment
   up by `providerReference` and no-ops on an already-terminal payment, so
   duplicate or replay webhooks are harmless by construction.

### Adding a new rail

Implement `PaymentRailAdapter` and add a `@Post('webhooks/<rail>')` handler.
The handler must (a) verify transport authenticity, (b) call the adapter's
`parseWebhookPayload` to map native events into the normalized shape, and
(c) hand the validated `{ providerReference, outcome }` to
`PaymentConfirmationService.apply`. The contract above — not any single
provider's field names — is the boundary every rail is held to.

