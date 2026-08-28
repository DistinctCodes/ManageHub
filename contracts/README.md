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
| `0`       | *(not found)*  | `NOT_FOUND`            |
| `1`       | Locked         | `LOCKED`               |
| `2`       | Released       | `RELEASED`             |
| `3`       | Refunded       | `REFUNDED`             |

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

## Arithmetic Safety (CT-73)

All amount-handling paths in every contract **must** use checked arithmetic
(`checked_add` / `checked_sub`) rather than raw `+` / `-` operators. The
`payment_escrow` scaffold includes helper functions and tests demonstrating
this pattern. See [`payment_escrow/src/lib.rs`](payment_escrow/src/lib.rs).

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
