# ManageHub Monolith Split Plan

## Current State

The `manage_hub` contract is a monolith with **11,018 lines** across 20 modules.
All logic lives in a single `#[contract]` with a single `#[contractimpl]` block.

## Proposed Crate Extraction

### Group 1: `membership_token` (expand existing crate)
**Modules:** `membership_token.rs` (1,614 lines), `allowance.rs` (160 lines), `fractionalization.rs` (337 lines)
**New crate:** `contracts/membership_token/` (expand existing)

**Rationale:** Core token logic (issue, transfer, metadata, renewal, allowance, fractionalization)
forms a cohesive unit. The existing `membership_token` crate already provides a basic
standalone contract; this expansion brings in the full feature set from the monolith.

**Dependencies on manage_hub:** Uses `errors::Error`, `guards::PauseGuard`, `types::*`.
After extraction, these will be local to the crate.

### Group 2: `staking_rewards` (new crate)
**Modules:** `staking.rs` (396 lines), `rewards.rs` (65 lines), `staking_errors.rs` (43 lines)
**New crate:** `contracts/staking_rewards/`

**Rationale:** Staking and rewards form a self-contained subsystem. They share storage keys,
types, and error handling but have minimal coupling to the rest of the monolith.

**Dependencies on manage_hub:** Uses `membership_token::DataKey::Admin` for admin checks,
`types::StakeInfo`, `types::StakingConfig`, `types::StakingTier`. These will be moved to
the new crate.

### Group 3: `subscription_tier` (stub)
**Modules:** `subscription.rs` (1,489 lines)
**Proposed crate:** `contracts/subscription_tier/`

**Rationale:** Subscription management with tier support is large enough to warrant
its own crate. It includes tier CRUD, promotions, feature access, analytics, and pause/resume.

**Key dependencies:** `membership_token::DataKey::Admin`, `attendance_log::AttendanceLogModule`,
`types::*`. Would need shared types in `common_types`.

### Group 4: `attendance_batch` (stub)
**Modules:** `attendance_log.rs` (531 lines), `batch.rs` (72 lines), `validation.rs` (22 lines)
**Proposed crate:** `contracts/attendance_batch/`

**Rationale:** Attendance logging with batch operations and analytics is a natural group.
Batch operations call into membership_token, so the interface boundary would need
cross-contract calls or trait abstractions.

### Group 5: `token_upgrade` (stub)
**Modules:** `upgrade.rs` (430 lines), `migration.rs` (159 lines), `upgrade_errors.rs` (43 lines)
**Proposed crate:** `contracts/token_upgrade/`

**Rationale:** Token versioning, snapshots, and rollback logic is self-contained except
for its dependency on `MembershipToken` type and `DataKey::Admin`.

### Group 6: `pause_control` (stub)
**Modules:** `guards.rs` (130 lines), `pause_errors.rs` (32 lines)
**Proposed crate:** `contracts/pause_control/`

**Rationale:** Pause state management is small but conceptually independent. Could be
shared across multiple contracts.

## Dependency Graph

```
                    common_types
                        |
        +-------+-------+-------+-------+
        |       |       |       |       |
  pause_control |   staking_rewards  token_upgrade
        |       |       |       |       |
        v       v       v       v       v
    membership_token <--- subscription_tier
        |       ^       ^
        |       |       |
        v       |       |
    attendance_batch   royalty
```

## Extraction Phases

### Phase 1 (This PR)
- [x] Expand `membership_token` crate with full types from monolith
- [x] Create `staking_rewards` crate
- [x] Create stub crates for remaining groups
- [x] Update workspace `Cargo.toml`
- [x] Document inter-module dependencies

### Phase 2 (Future)
- [ ] Extract `subscription_tier` crate with full subscription logic
- [ ] Extract `attendance_batch` crate
- [ ] Extract `token_upgrade` crate
- [ ] Extract `pause_control` crate
- [ ] Convert monolith to a thin facade that calls extracted crates

### Phase 3 (Future)
- [ ] Replace cross-crate type references with shared `common_types`
- [ ] Add integration tests across extracted crates
- [ ] Remove monolith facade entirely

## Shared Types (move to `common_types`)

Types that are used across multiple proposed crates should live in `common_types`:
- `MembershipStatus` (already in common_types)
- `StakeInfo`, `StakingConfig`, `StakingTier`
- `Subscription`, `SubscriptionTier`, `BillingCycle`
- `AttendanceAction`, `AttendanceSummary`
- `EmergencyPauseState`, `TokenPauseState`
- `UpgradeConfig`, `UpgradeRecord`, `TokenVersionSnapshot`
- `RenewalConfig`, `RenewalHistory`, `AutoRenewalSettings`
- `TokenAllowance`, `RoyaltyConfig`, `RoyaltyInfo`
- `FractionalTokenInfo`, `FractionHolder`, `DividendDistribution`
- All error enums

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking existing deployments | Keep monolith as facade; new crates are additive |
| Circular dependencies | Phase extraction carefully; use shared types crate |
| Test coverage gaps | Run existing test suite after each extraction |
| Storage key conflicts | Use crate-prefixed storage keys in new crates |
