# Contract ↔ Backend Compatibility Matrix

This document tracks compatibility between deployed Soroban smart contracts and NestJS backend client releases, ensuring clean lifecycle management, non-breaking integrations, and deterministic migration paths across releases (#2028).

---

## 1. Compatibility Matrix

| Contract | Contract Version | Soroban SDK | WASM Hash / Deployment ID | Required Entrypoints | Compatible Backend Versions | Migration & Settlement Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `payment_escrow` | `0.1.0` | `v22.0.0` | `current-standalone-deploy` | `create`, `release`, `refund`, `get_status`, `get_escrow` | `>= 0.0.1` | Baseline initial release. Supports single-asset payment escrow, timeout safeguards, and partial release capabilities. |
| `revenue_distribution` | `0.1.0` | `v22.0.0` | `current-standalone-deploy` | `initialize`, `configure`, `distribute`, `version` | `>= 0.0.1` | Baseline revenue sharing protocol with deterministic basis-point share allocation (summing to 10,000 bps). |

---

## 2. Detailed Interface Contracts

### 2.1 `payment_escrow` (v0.1.0)

- **Backend Consumer**: [`backend/src/payments/soroban/escrow-contract.client.ts`](../backend/src/payments/soroban/escrow-contract.client.ts)
- **Environment Key**: `STELLAR_ESCROW_CONTRACT_ID`
- **Public Entrypoints**:
  ```rust
  fn create(env: Env, escrow_id: BytesN<32>, payer: Address, beneficiary: Address, amount: i128)
  fn release(env: Env, escrow_id: BytesN<32>)
  fn refund(env: Env, escrow_id: BytesN<32>)
  fn get_status(env: Env, escrow_id: BytesN<32>) -> u32
  fn get_escrow(env: Env, id: BytesN<32>) -> Escrow
  ```
- **Status Code Mapping**:
  | On-Chain Status Code | Backend Enum Name (`EscrowStatus`) | Description |
  | :--- | :--- | :--- |
  | `1` | `LOCKED` | Escrow created; funds locked awaiting release or refund |
  | `2` | `RELEASED` | Escrow settled; funds released to beneficiary |
  | `3` | `REFUNDED` | Escrow returned; funds refunded back to payer |
  | `Err(Error::NotFound)` | `NOT_FOUND` | Escrow ID does not exist in contract storage |

### 2.2 `revenue_distribution` (v0.1.0)

- **Backend Consumer**: Configured via contract client bindings for automated revenue splits.
- **Environment Key**: `STELLAR_REVENUE_CONTRACT_ID`
- **Public Entrypoints**:
  ```rust
  fn initialize(env: Env, admin: Address)
  fn configure(env: Env, recipients: Vec<Recipient>, total_shares: u32)
  fn distribute(env: Env, token: Address, amount: i128)
  fn version(env: Env) -> u32
  ```

---

## 3. Migration & In-Flight Escrow Settlement Policy

When introducing a new contract version with breaking changes or modified WASM bytecode:

1. **Dual-Contract Settlement (In-Flight Coexistence)**:
   - Existing escrows created under contract version `N` must remain settleable (`release` or `refund`) through their original contract address.
   - The backend stores `contract_id` per escrow record in the database instead of relying solely on the global `STELLAR_ESCROW_CONTRACT_ID`.
2. **State & Storage Migration**:
   - Because Soroban persistent storage keys are scoped to the deployed contract instance, upgrading a contract without state migration requires deprecating creation on the old contract (`pause`) while permitting existing escrows to conclude.
   - Refer to [`contracts/UPGRADE.md`](UPGRADE.md) for step-by-step state migration procedures when changing `DataKey` definitions.
3. **Graceful Upgrades**:
   - New feature releases that do not alter existing entrypoint signatures maintain backward compatibility across backend patch versions (`0.0.x`).

---

## 4. Checklist for Contract PR Authors

Every pull request modifying files under `contracts/` must:
- [ ] Check whether any public entrypoint signature or return type changed.
- [ ] If changing entrypoints, adding fields, or bumping contract version, update `contracts/COMPATIBILITY.md` with the new version and backend requirement.
- [ ] Update `contracts/CHANGELOG.md` with explicit notes for integrators.
