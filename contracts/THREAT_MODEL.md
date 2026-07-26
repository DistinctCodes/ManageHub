# Threat Model – ManageHub Contract Suite

This document identifies attack vectors and documented mitigations for each Soroban contract in the ManageHub monorepo.

---

## 1. manage_hub (Monolith)

| Vector | Description | Mitigation |
|---|---|---|
| Unauthorized admin change | Attacker calls `set_admin` directly | `require_auth()` on admin; multisig integration via access_control |
| Front-running pause toggle | Frontrunner submits `set_pause_config` ahead of legitimate tx | Time-locked operations documented; consider commit-reveal pattern |
| Integer overflow | Overflow in subscription/pricing arithmetic | `overflow-checks = true` in release profile; checked arithmetic used |
| Denial of service | Unbounded loops in storage iteration | Pagination via `Vec` with bounded page sizes |
| Reentrancy | Callback during cross-contract calls | Soroban VM prevents cross-contract reentrancy by design |

## 2. access_control

| Vector | Description | Mitigation |
|---|---|---|
| Privilege escalation | Non-admin calling `set_role` | `is_admin` guard checked before mutation |
| Proposal replay | Re-executing expired multisig proposals | `ProposalType::Expiry` field checked; proposals expire after deadline |
| Role enumeration DoS | Enumerate all roles to exhaust resources | Roles stored per-address, not enumerable |
| Unauthorized proposal vote | Non-member voting on a proposal | `MembershipInfo` checked before vote is accepted |

## 3. membership_token

| Vector | Description | Mitigation |
|---|---|---|
| Double mint | Minting same token twice | Token ID uniqueness enforced by storage key |
| Unauthorized transfer | Transfer without owner auth | `require_auth()` on sender |
| Overflow in supply | Minting past `u128::MAX` | Checked arithmetic; `overflow-checks = true` |

## 4. workspace_booking

| Vector | Description | Mitigation |
|---|---|---|
| Double-booking | Two users booking same slot | Atomic check-and-set in persistent storage |
| Front-running bookings | Frontrunner sees booking tx and submits first | Consider commit-reveal for high-contention bookings |
| DoS via phantom bookings | Reserve slots without paying | Payment confirmation required before booking finalised |

## 5. payment_escrow

| Vector | Description | Mitigation |
|---|---|---|
| Reentrancy on release | Re-entering escrow during release callback | Soroban VM prevents cross-contract reentrancy |
| Stuck funds | No release/refund path | Both `release` and `refund` paths implemented with admin/timeout |
| Integer overflow | Overflow on fee calculation | Checked arithmetic; overflow-checks profile flag |

## 6. resource_credits

| Vector | Description | Mitigation |
|---|---|---|
| Unbounded expiry scan | Iterating all members to expire credits | `expire_credits` operates per-member; `get_expiring_credits` requires explicit member list |
| Supply drift | Balance sum diverges from total_supply | `reconcile_credits` provides audit function; new in SC-25 |
| Credit expiry bypass | Member avoids expiry by transferring before TTL | Expiry is tracked per-mint; transferred credits still carry original expiry via Credit record |
| Unauthorised mint | Minting without admin role | `caller == admin` check + `require_auth()` |

---

## General Mitigations (All Contracts)

- **No `std`**: All contracts compile with `#![no_std]` to reduce attack surface.
- **Overflow checks**: Release profile sets `overflow-checks = true`.
- **LTO + strip**: Release binary is stripped of symbols and link-time optimized to minimise bloat.
- **Soroban VM sandbox**: Cross-contract calls are sandboxed; no arbitrary memory access.
- **Auth guards**: Every state-changing function requires `require_auth()` from the relevant authority.

## Recommended Additional Mitigations

1. **Commit-reveal for booking and proposals** – prevents front-running.
2. **Rate limiting on `expire_credits`** – bound gas per invocation.
3. **Per-address credit expiry tracking** – avoid scanning the full member set.
4. **Formal verification** – consider Certora or similar for payment_escrow invariants.
5. **Audit of `reconcile_credits`** – ensure Vec member list cannot be manipulated to hide discrepancies.
