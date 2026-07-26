# ManageHub Contract

## Overview

The `manage_hub` contract is the central hub for the ManageHub coworking platform. It integrates subscription management, membership token NFTs, token metadata, staking, fractionalization, upgrades, attendance tracking, emergency pause, and batch operations into a single Soroban contract.

## Architecture

```
src/
├── lib.rs                 — Contract entry points, module integration
├── types.rs               — Shared types for the hub
├── errors.rs              — Error codes
├── test.rs                — Unit tests
├── subscription.rs        — Subscription & tier management
├── membership_token.rs    — NFT membership token logic
├── staking.rs             — Token staking mechanics
├── fractionalization.rs   — Token fractional ownership
├── upgrade.rs             — Token upgrade/rollback mechanism
├── attendance_log.rs      — Attendance tracking & analytics
├── allowance.rs           — Token allowance/approval
├── batch.rs               — Batch mint/transfer/update operations
├── royalty.rs             — Royalty configuration for token transfers
├── guards.rs              — Auth guards
├── validation.rs          — Input validation
├── migration.rs           — Data migration helpers
├── pause_errors.rs        — Pause-related error types
├── staking_errors.rs      — Staking error types
└── upgrade_errors.rs      — Upgrade error types
```

### Sub-Module Summary

| Module | Purpose |
|--------|---------|
| `subscription` | Create, renew, cancel, pause subscriptions; tier CRUD; promotions; feature access |
| `membership_token` | Issue, transfer, renew membership NFTs; metadata; auto-renewal |
| `staking` | Stake tokens for rewards; configurable staking tiers and penalties |
| `fractionalization` | Fractional ownership of tokens; dividend distribution |
| `upgrade` | Versioned token upgrades with rollback support |
| `attendance_log` | Clock-in/out tracking; attendance analytics and peak-hour analysis |
| `batch` | Batch mint, transfer, and metadata update operations |
| `royalty` | Configure per-token royalty splits on transfers |

## Functions

### Subscription Management

```rust
fn create_subscription(env, id, user, payment_token, amount, duration) -> Result<(), Error>
fn renew_subscription(env, id, payment_token, amount, duration) -> Result<(), Error>
fn cancel_subscription(env, id) -> Result<(), Error>
fn pause_subscription(env, id, reason) -> Result<(), Error>
fn resume_subscription(env, id) -> Result<(), Error>
fn create_subscription_with_tier(env, id, user, payment_token, tier_id, billing_cycle, promo_code) -> Result<(), Error>
```

### Tier Management

```rust
fn create_tier(env, admin, params) -> Result<(), Error>
fn update_tier(env, admin, params) -> Result<(), Error>
fn get_tier(env, id) -> Result<SubscriptionTier, Error>
fn get_all_tiers(env) -> Vec<SubscriptionTier>
fn get_active_tiers(env) -> Vec<SubscriptionTier>
fn deactivate_tier(env, admin, id) -> Result<(), Error>
fn create_promotion(env, admin, params) -> Result<(), Error>
fn get_promotion(env, promo_id) -> Result<TierPromotion, Error>
fn check_feature_access(env, subscription_id, feature) -> Result<bool, Error>
```

### Membership Token (NFT)

```rust
fn issue_token(env, id, user, expiry_date) -> Result<(), Error>
fn transfer_token(env, id, new_user) -> Result<(), Error>
fn transfer_token_with_royalty(env, id, new_user, payment_token, sale_price) -> Result<(), Error>
fn get_token(env, id) -> Result<MembershipToken, Error>
fn set_token_metadata(env, token_id, description, attributes) -> Result<(), Error>
fn get_token_metadata(env, token_id) -> Result<TokenMetadata, Error>
```

### Staking

```rust
fn set_staking_config(env, admin, config) -> Result<(), Error>
fn create_staking_tier(env, admin, tier) -> Result<(), Error>
fn stake_tokens(env, staker, tier_id, amount) -> Result<(), Error>
fn unstake_tokens(env, staker) -> Result<(), Error>
fn emergency_unstake(env, staker) -> Result<(), Error>
fn get_stake_info(env, staker) -> Option<StakeInfo>
```

### Token Upgrade

```rust
fn upgrade_token(env, caller, token_id, label, new_expiry, new_tier, new_status) -> Result<u32, Error>
fn batch_upgrade_tokens(env, admin, token_ids, label, new_expiry) -> Result<Vec<BatchUpgradeResult>, Error>
fn rollback_token_upgrade(env, admin, token_id, target_version) -> Result<u32, Error>
fn get_upgrade_history(env, token_id) -> Vec<UpgradeRecord>
```

### Attendance

```rust
fn log_attendance(env, id, user_id, action, details) -> Result<(), Error>
fn get_attendance_summary(env, user_id, date_range) -> Result<AttendanceSummary, Error>
fn analyze_peak_hours(env, user_id, date_range) -> Result<Vec<PeakHourData>, Error>
fn analyze_day_patterns(env, user_id, date_range) -> Result<Vec<DayPattern>, Error>
```

### Batch Operations

```rust
fn batch_mint(env, params) -> Result<(), Error>
fn batch_transfer(env, params) -> Result<(), Error>
fn batch_update(env, params) -> Result<(), Error>
```

### Emergency Pause

```rust
fn emergency_pause(env, admin, reason, auto_unpause_after, time_lock_duration) -> Result<(), Error>
fn emergency_unpause(env, admin) -> Result<(), Error>
fn is_contract_paused(env) -> bool
fn pause_token_operations(env, admin, token_id, reason) -> Result<(), Error>
fn unpause_token_operations(env, admin, token_id) -> Result<(), Error>
```

## Example Usage

```rust
// Create a subscription with tier
client.create_subscription_with_tier(
    &String::from_str(&env, "sub-001"),
    &user,
    &payment_token,
    &String::from_str(&env, "pro-monthly"),
    &BillingCycle::Monthly,
    &None,
);

// Issue a membership token
client.issue_token(
    &BytesN::<32>::from_array(&env, &[0u8; 32]),
    &user,
    &(env.ledger().timestamp() + 31_536_000), // 1 year
);

// Log attendance
client.log_attendance(
    &BytesN::<32>::from_array(&env, &[0u8; 32]),
    &user,
    &AttendanceAction::ClockIn,
    &Map::new(&env),
);
```

## Error Codes

Error codes are defined per sub-module. See each module's documentation for specific error ranges.

## Testing

```bash
cargo test -p manage_hub
```
