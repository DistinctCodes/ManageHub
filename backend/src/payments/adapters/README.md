# Payment-rail failover

Payment initiation may use a different rail when the requested rail is not
available, but the policy is deliberately opt-in. `PaymentRailRegistry.get()`
is the strict lookup used after a payment exists; `resolve()` is used only by
`PaymentsService` while initiating a new payment.

## What availability means

Availability currently means that the adapter is registered and configured:

- `FIAT` is available through the sandbox adapter.
- `STELLAR_CUSTODIAL` and `STELLAR_EXTERNAL` are available only when the
  Soroban adapter is configured.
- Resolution does not perform a live network health check. An adapter that
  is registered can still fail when its provider call is made; switching after
  that call could duplicate a charge or an escrow, so it is not attempted.

## Configuration

Set `PAYMENT_RAIL_FAILOVER` to a comma-separated list of explicit
`FROM=TO` mappings. The mappings form an ordered, auditable chain:

```dotenv
PAYMENT_RAIL_FAILOVER=STELLAR_CUSTODIAL=FIAT,FIAT=
```

The example means that an unavailable `STELLAR_CUSTODIAL` may fall back to
`FIAT`; the empty `FIAT=` target explicitly ends the chain. A longer chain
can be expressed by linking mappings:

```dotenv
PAYMENT_RAIL_FAILOVER=STELLAR_CUSTODIAL=FIAT,FIAT=STELLAR_EXTERNAL,STELLAR_EXTERNAL=
```

A source or target that is not a known `PaymentRail`, a duplicate source, or
a cycle is rejected with a configuration error. If the variable is unset or
empty, there is no fallback and the existing clear unavailable-rail error is
preserved.

## Stored-rail invariant

When a fallback is selected, `PaymentsService` stores the rail that actually
received the initiation call in `Payment.rail` and records the caller's
request as `metadata.requestedRail`. The original request is retained so an
idempotency-key replay compares against the requested payload rather than the
fallback implementation detail.

The stored rail is never rewritten later. Webhook confirmation,
reconciliation, verify-on-return, and refund provider calls resolve the
adapter from `Payment.rail`, so changing it after initiation could send a
provider reference to a different rail and break confirmation.

If no configured fallback is available, initiation fails with the existing
clear configuration error; it does not enter a silent degraded mode. Once a
provider call has started, an error is left to the normal payment error and
reconciliation paths rather than starting a second provider call on another
rail.
