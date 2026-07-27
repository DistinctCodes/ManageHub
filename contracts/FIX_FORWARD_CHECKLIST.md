# Fix-Forward Checklist

Known issues and recommended fix-forward items for the contract suite. Items are ordered by priority.

---

## Critical

| ID | Contract | Description | Status |
|---|---|---|---|
| FF-01 | resource_credits | `reconcile_credits` accepts arbitrary member Vec – an attacker can omit members to hide discrepancies. Consider persisting a member registry. | Open |
| FF-02 | payment_escrow | No timeout-based automatic refund implemented – funds could be locked indefinitely if release key is lost. | Open |

## High

| ID | Contract | Description | Status |
|---|---|---|---|
| FF-03 | workspace_booking | Double-booking race condition under concurrent transactions – add commit-reveal or nonce check. | Open |
| FF-04 | access_control | Proposal expiry not enforced if `ProposalType::Expiry` is None – add mandatory expiry. | Open |
| FF-05 | resource_credits | `expire_credits` only burns up to the minted amount, not the full balance – consider configurable TTL scope. | Open |

## Medium

| ID | Contract | Description | Status |
|---|---|---|---|
| FF-06 | manage_hub | `set_pause_config` can be called without multisig – verify integration with access_control. | Open |
| FF-07 | membership_token | No `burn` function exposed – tokens cannot be voluntarily surrendered. | Open |
| FF-08 | resource_credits | Missing event for `reconcile_credits` – makes off-chain monitoring harder. | Open |
| FF-09 | bindings | TypeScript bindings script not tested in CI yet. | Open |

## Low

| ID | Contract | Description | Status |
|---|---|---|---|
| FF-10 | all | Some contracts use deprecated `env.events().publish()` – migrate to `#[contractevent]`. | Open |
| FF-11 | all | Clippy warnings may exist in newer Rust versions after toolchain pin – run `cargo clippy` post-pin. | Open |
| FF-12 | resource_credits | `Credit` struct has `owner` field redundant with storage key – consider removing for gas savings. | Open |

---

## CI / Clippy / Build Notes

- Ensure `cargo clippy --target wasm32-unknown-unknown -- -D warnings` passes after Rust 1.82.0 pin.
- Add `soroban contract bindings typescript` step to CI after SC-24 merge.
- Run `cargo fmt --check` in CI using the `rustfmt` component from `rust-toolchain.toml`.
