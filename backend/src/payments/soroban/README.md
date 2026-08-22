# Soroban escrow rail

On-chain escrow (create/release/refund/status) as a `PaymentRailAdapter`
(issue #1574), payment track item 5/7. Depends on #1570 (rail
abstraction), #1571 (confirmation pipeline), #1572 (retry/backoff,
failure taxonomy, reconciliation pattern), #1573 (wallet signing).

## What's here vs. what isn't

This ships the full submission pipeline, RPC resilience, error taxonomy,
and chain-state reconciliation wiring, all unit-tested. Two things this
PR deliberately does **not** do, both flagged here rather than silently
skipped:

- **No live testnet deployment.** `SOROBAN_ENABLED` defaults to `false`;
  nothing here activates until an operator deploys a contract and sets
  `STELLAR_ESCROW_CONTRACT_ID` and friends (see `.env.example`). Doing an
  actual testnet deployment is an operational action (funding an account,
  running the Stellar CLI) outside what a PR's CI can respons­ibly do.
- **`escrow-contract.client.ts` is hand-written, not generated.**
  `stellar contract bindings typescript` needs a deployed contract to
  generate against; this file targets the reference ABI documented in its
  header. Once a contract exists, regenerate real bindings from it and
  swap them in — nothing else in this module depends on how a call is
  XDR-encoded, only on the method signatures `EscrowContractClient`
  exposes now.

## Escrow-ID discipline

`deriveEscrowId(paymentId)` is a pure function (sha256 of the UUID) — the
escrow_id is never a separate stored value, it's always recomputable from
`Payment#id`. That's a stronger link than a mapping table with its own
unique constraint could give: there's nothing to get out of sync.

## The submission pipeline

`SorobanRailAdapter.initiate()` never touches the chain on the request
thread — it derives the escrow_id and enqueues a `submit` job (Bull, on
the `soroban-escrow` queue), returning immediately so the Payment reaches
`AWAITING_CONFIRMATION` fast. `EscrowSubmissionProcessor` does the actual
build → simulate → sign → submit → bounded-poll work in the background,
via `KeyCustodyService.sign` (through `WalletsService.signPayload` — see
#1573) for the payer's custodial key, and a plain treasury key
(`STELLAR_SECRET_KEY`) for release/refund, which are platform-operated
actions rather than a per-user custodial one.

All three job kinds (create/release/refund) route through one job name
and one `@Process({ concurrency: 1 })` handler, so every submission this
rail makes is strictly serialized regardless of which account signs it —
stronger than "per signing account," which is what the issue's
sequence-number-race edge case asks for. The cost is throughput, not
correctness; a real Bull+Redis integration test is the natural follow-up
to verify this at the queue level (this module's tests verify each
handler's own logic, not Bull's scheduling).

## The hard rule

A Payment is only ever moved to `CONFIRMED` after a *fresh* contract-state
read (`EscrowContractClient.getEscrowStatus`) — never off a submission's
`SUCCESS` response, which only proves the call didn't revert. See
`EscrowSubmissionProcessor.resolveFromFreshState`, the only path that
calls `PaymentConfirmationService.apply(..., 'confirmed', ...)`.

The same fresh-read requirement is why an indeterminate submission error
(RPC timeout, connection down) is never treated as a failure: it isn't a
verdict at all. `soroban-error-mapping.ts` separates "definitely rejected
on-chain" (maps to a specific `PaymentFailureReason`) from "we don't know
yet" (`reason: null`, leaves the Payment `AWAITING_CONFIRMATION` for
`ReconciliationService` — now rail-dispatched via `PaymentRailRegistry`,
see below — to resolve independently, by asking the chain again, not by
trusting this attempt's own memory of what it sent).

## PaymentRailRegistry

`PaymentsService`, `RefundsService`, `PaymentConfirmationService`, and
`ReconciliationService` used to depend on the concrete `SandboxRailAdapter`
directly — #1570 only ever needed one adapter. `PaymentRailRegistry`
resolves the right `PaymentRailAdapter` by `Payment#rail`: `FIAT` always
goes to the sandbox adapter; the Stellar rails go to the Soroban adapter
only when it's actually configured, otherwise callers get a clear error
naming why instead of a payment silently going nowhere.

`PaymentWebhookController` is deliberately **not** rail-dispatched — it's
bound to the fiat/sandbox rail's webhook format specifically. Soroban has
no webhook channel at all; see `SorobanRailAdapter`'s class doc.
