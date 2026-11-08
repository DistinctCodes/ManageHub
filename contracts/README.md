# Soroban Contracts — Backend Integration Reference

This directory contains the Soroban smart contract workspace for ManageHub.

## Backend ↔ Contract Interface

The NestJS backend interacts with the `payment_escrow` contract via a hand-written client at
[`backend/src/payments/soroban/escrow-contract.client.ts`](../backend/src/payments/soroban/escrow-contract.client.ts).

### Required Entrypoints

The backend expects **exactly** these four public functions on the deployed contract:

```
fn create(escrow_id: BytesN<32>, payer: Address, beneficiary: Address, amount: i128)
fn release(escrow_id: BytesN<32>)
fn refund(escrow_id: BytesN<32>)
fn get_status(escrow_id: BytesN<32>) -> u32
```

| Method       | Backend caller                  | Purpose                                      |
| ------------ | ------------------------------- | -------------------------------------------- |
| `create`     | `buildCreateTx()`              | Lock funds in a new escrow                   |
| `release`    | `buildReleaseTx()`             | Release escrowed funds to the beneficiary    |
| `refund`     | `buildRefundTx()`              | Refund escrowed funds to the payer           |
| `get_status` | `getEscrowStatus()` (simulate) | Read-only status check, never submitted      |

### Status Code Mapping

The `get_status` return value maps to the backend's `EscrowStatus` enum
([`escrow-status.enum.ts`](../backend/src/payments/soroban/escrow-status.enum.ts)):

| Raw `u32` | Contract State | Backend `EscrowStatus` |
| --------- | -------------- | ---------------------- |
| `1`       | Locked         | `LOCKED`               |
| `2`       | Released       | `RELEASED`             |
| `3`       | Refunded       | `REFUNDED`             |
| `4`       | Completed (fully released in instalments) | - |

A missing escrow is **not** a status code: `get_status` returns
`Err(Error::NotFound)`, which surfaces to clients as `Error(Contract, #1)`. The
backend maps that error to `NOT_FOUND`.

### Error Codes

| Code | Error                 | Meaning                                              |
| ---- | --------------------- | ---------------------------------------------------- |
| `1`  | `NotFound`            | No escrow exists for the id                          |
| `2`  | `AlreadyResolved`     | The escrow is no longer `Locked`                     |
| `3`  | `InvalidAmount`       | Amount must be positive                              |
| `4`  | `AlreadyExists`       | An escrow with this id already exists                |
| `5`  | `ArithmeticOverflow`  | Checked arithmetic failed                            |
| `20` | `AmountExceedsEscrow` | A partial release would exceed the locked amount     |
| `21` | `NothingToRefund`     | Nothing remains to refund                            |

### Amount Units and Token Decimals

`amount` is an `i128` in **the escrowed token's smallest unit**, not fiat minor
units. The backend stores fiat amounts in minor units (cents); it must convert
to token units before building the transaction:

```
token_units = round_half_up(fiat_minor_units * 10^token_decimals / 10^fiat_decimals / rate)
```

Rounding is applied once, on the backend, to the token amount; the contract
never rounds. Most Stellar assets use 7 decimals.

Worked example: 50.00 USD paid in a token pegged 1:1 to USD with 7 decimals.
The payment record holds `5000` (cents); `5000 * 10^7 / 10^2 = 500_000_000`
token units, which is the `amount` passed to `create`. Partial releases use the
same unit and satisfy `released <= amount`.

### Configuration Variables

These environment variables bind the backend to the on-chain contract
(see [`soroban-config.ts`](../backend/src/payments/soroban/soroban-config.ts)):

| Variable                       | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `SOROBAN_ENABLED`              | `"true"` to activate the Stellar escrow rail; any other value disables it   |
| `STELLAR_ESCROW_CONTRACT_ID`   | StrKey-encoded address of the deployed `payment_escrow` contract            |
| `STELLAR_NETWORK`              | Stellar network passphrase (e.g. `Test SDF Network ; September 2015`)       |
| `STELLAR_RPC_URLS`             | Comma-separated Soroban RPC endpoints                                       |
| `STELLAR_SECRET_KEY`           | Treasury/operator secret key for signing releases and refunds               |
| `STELLAR_BENEFICIARY_ADDRESS`  | Default beneficiary Stellar address                                          |

### Escrow ID Derivation

The backend derives escrow IDs as the **SHA-256 hash** of the `Payment` entity UUID,
passed to the contract as `BytesN<32>`. See `escrow-submission.processor.ts` for the
exact derivation.

## Escrow Lifecycle & Backend Idempotency/Retry Specification (#2026)

This specification defines transaction semantics, idempotency guarantees, error handling, and reconciliation behavior for backend operations (`create`, `release`, `release_partial`, `refund`, `refund_remaining`, `get_status`).

### 1. State Machine & Terminal Finality

```
                 ┌────────────────────────────────┐
                 │          [Non-Existent]        │
                 └──────────────┬─────────────────┘
                                │ create()
                                ▼
                       ┌─────────────────┐
                       │   Locked (1)    │
                       └─┬──────┬──────┬─┘
           release()     │      │      │     refund()
        ┌────────────────┘      │      └─────────────────┐
        ▼                       ▼ partial_release()       ▼
┌──────────────┐      ┌──────────────────┐      ┌────────────────┐
│ Released (2) │      │   Locked (1)     │      │  Refunded (3)  │
│  (Terminal)  │      │  (Partial: <100%)│      │   (Terminal)   │
└──────────────┘      └─────────┬────────┘      └────────────────┘
                                │
                                │ release_partial() completes
                                ▼
                      ┌──────────────────┐
                      │  Completed (4)   │
                      │   (Terminal)     │
                      └──────────────────┘
```

- **Terminal States**: `Released` (2), `Refunded` (3), and `Completed` (4) are strictly terminal and immutable. Once an escrow enters any of these states:
  - No further token transfers or settlement transitions can occur.
  - Subsequent settlement attempts return `Error::AlreadyResolved` (2), `Error::AlreadyReleased` (6), or `Error::AlreadyRefunded` (7).

### 2. Idempotency & Retry Guarantees

| Operation | First Call | Retry with Identical Arguments | Contract Error Code | Backend Interpretation |
|---|---|---|---|---|
| `create` | Locks funds, transitions to `Locked` (1) | Rejected with `AlreadyExists` (4) | `Error::AlreadyExists` (4) | Prevents double-debiting payer tokens. Backend catches `AlreadyExists` / error code 4 and triggers state reconciliation via `get_status`. |
| `release` | Transfers full balance to beneficiary, transitions to `Released` (2) | Rejected with `AlreadyReleased` (6) | `Error::AlreadyReleased` (6) | Treated by backend as `alreadySucceeded: true` (funds already delivered). |
| `release_partial` | Transfers partial amount to beneficiary | If already completed: `AlreadyResolved` (2). If remaining available: executes next increment. | `Error::AlreadyResolved` (2) or `Error::AmountExceedsEscrow` (20) | Replay safe via caller idempotency checks. |
| `refund` | Returns full balance to payer, transitions to `Refunded` (3) | Rejected with `AlreadyRefunded` (7) | `Error::AlreadyRefunded` (7) | Treated by backend as `alreadySucceeded: true` (refund already issued). |
| `refund_remaining` | Returns remaining locked balance to payer | If already completed/refunded: `AlreadyResolved` (2). | `Error::AlreadyResolved` (2) / `Error::NothingToRefund` (21) | Treated as terminal resolution. |
| `get_status` | Read-only state inspection | Deterministic read-only query; safe to retry indefinitely | `Error::NotFound` (1) if non-existent | Never alters state; provides ground-truth on-chain reconciliation. |

### 3. Duplicate `create` vs No-Op Rationale

A duplicate `create` call explicitly returns `Error::AlreadyExists` (#4) instead of acting as a silent no-op (`Ok(())`).
- **Authorization & Debit Safety**: `create` requires `payer.require_auth()` and transfers tokens from `payer` to the contract. A silent no-op returning `Ok(())` could mask client configuration bugs (e.g., unintended ID collisions, parameter mismatches, or failed initial transfers where the caller assumes new funds were escrowed).
- **Explicit Signal**: Returning `Error::AlreadyExists` gives callers unambiguous confirmation that an escrow with this ID already occupies the contract storage. The backend submission processor intercepts this error, queries `get_status(escrow_id)`, and confirms whether the escrow is active in state `Locked` without risking accidental duplicate fund transfers.

### 4. Unconfirmed Transaction Reconciliation

When a submitted transaction encounters timeouts, network partitions, or RPC drops (`reason: null` / indeterminate status):
1. **Never Resubmit Blindly**: The processor does not resubmit `create`, `release`, or `refund` immediately, avoiding sequence errors and duplicate intents.
2. **Reconcile via `get_status`**:
   - If `get_status(escrow_id)` returns `Locked` (1) or `Released` (2), the transaction successfully landed on-chain. The backend reconciles payment status to `CONFIRMED`.
   - If `get_status(escrow_id)` returns `Refunded` (3), the backend reconciles payment status to `FAILED` (`CONTRACT_REVERTED`).
   - If `get_status(escrow_id)` returns `Error::NotFound` (1), the transaction did not land. It remains safely in `AWAITING_CONFIRMATION` for the next reconciliation pass.


## Arithmetic Safety (CT-73)

Amount-handling paths must use checked arithmetic (`checked_add` / `checked_sub`) rather than raw `+` / `-`. `revenue_distribution` already does this for its basis-point sum. `payment_escrow` stores a single amount per escrow and performs no arithmetic on it today; when partial releases or batch totals are added they must use the same checked pattern inline.

## Workspace Crates

| Crate             | Purpose                              |
| ----------------- | ------------------------------------ |
| `payment_escrow`  | Escrow lifecycle (create → release / refund) |

Additional crates (e.g. `resource_credits`, `staking_rewards`) should be added
as workspace members in [`Cargo.toml`](Cargo.toml) as they are developed.

## Tooling

- `make build` / `make test` / `make deploy` / `make clean` — see the root
  [`Makefile`](../Makefile) (CT-70).
- `make audit` — CI-enforced authorization audit; see
  [`scripts/audit_require_auth.sh`](../scripts/audit_require_auth.sh) (CT-72).

## Security

- [`SECURITY.md`](SECURITY.md) — trust model and pre-deployment checklist (CT-68).
- [`UPGRADE.md`](UPGRADE.md) — contract upgrade/migration path (CT-69).

## On-chain scope decisions

- **Settlement batches** (execute / retry / abandon) are modelled off-chain only, in the backend `settlement-batch.entity.ts`. There is no on-chain batch contract, so the placeholder `settlement_batch_lifecycle` tests were removed.
- **Split allocation** property tests and the **escrow-to-distribution** integration test were placeholders with no assertions. They are removed until the behaviour they describe exists on-chain; add them back with real assertions (a `proptest` dev-dependency and both contracts registered in one `Env`) together with that feature.
- `cargo test --workspace` now runs natively in CI together with `cargo fmt --check`, `cargo clippy -- -D warnings` and a WASM build.
