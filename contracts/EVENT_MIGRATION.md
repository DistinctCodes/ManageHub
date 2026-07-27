# Event Migration Audit

## Overview

This document audits all `env.events().publish()` usage across the ManageHub contracts
and identifies migration targets for the `#[contractevent]` attribute macro.

## Migration Pattern

The deprecated pattern:
```rust
env.events().publish(
    (symbol_short!("event_name"), key1, key2),
    (data1, data2),
);
```

Should be migrated to:
```rust
#[contractevent]
pub struct EventName {
    pub key1: Address,
    pub key2: BytesN<32>,
    pub data1: u64,
    pub data2: i128,
}
```

## Event Inventory

### `manage_hub` Contract

| Location | Event Symbol | Keys | Data | Migration Status |
|----------|-------------|------|------|-----------------|
| `membership_token.rs:122` | `token_iss` | id, user | admin, timestamp, expiry, status | Candidate |
| `membership_token.rs:198` | `token_xfr` | id, new_user | old_user, timestamp | Candidate |
| `membership_token.rs:225` | `tok_sale` | id, new_user | sale_price, timestamp | Candidate |
| `membership_token.rs:320-327` | `token_xfr`/`token_dlg` | id, to/spender | old_user, timestamp, allowance | Candidate |
| `membership_token.rs:390` | `admin_set` | admin | timestamp | Candidate |
| `membership_token.rs:604` | `meta_set` | token_id, version | caller, timestamp | Candidate |
| `membership_token.rs:743` | `meta_upd` | token_id, version | caller, timestamp | Candidate |
| `membership_token.rs:819` | `meta_rmv` | token_id, version | caller, timestamp | Candidate |
| `membership_token.rs:915` | `rnw_cfg` | admin | grace_period, notice_days, enabled | Candidate |
| `membership_token.rs:1064` | `token_rnw` | id, user | payment_token, amount, old_expiry, new_expiry | Candidate |
| `membership_token.rs:1145` | `grace_in` | id, user | entered_at, expires_at | Candidate |
| `membership_token.rs:1198` | `auto_rnw` | token_id, user | enabled, payment_token | Candidate |
| `membership_token.rs:1343` | `auto_ok` | id, user | payment_token, amount, old_expiry, new_expiry | Candidate |
| `membership_token.rs:1401` | `emg_pause` | admin | timestamp, reason, auto_unpause_at, time_lock_until | Candidate |
| `membership_token.rs:1450` | `emg_unp` | admin | timestamp | Candidate |
| `membership_token.rs:1520` | `tok_pause` | token_id, admin | timestamp, reason | Candidate |
| `membership_token.rs:1568` | `tok_unp` | token_id, admin | timestamp | Candidate |
| `membership_token.rs:1603` | `grace_ar` | id, user | entered_at, expires_at, reason | Candidate |
| `allowance.rs:49` | `Approval` | token_id, owner, spender | amount, expires_at, timestamp | Candidate |
| `allowance.rs:71` | `AllowanceRevoked` | token_id, owner, spender | timestamp | Candidate |
| `allowance.rs:141` | `AllowanceUsed` | token_id, owner, spender | amount, remaining, timestamp | Candidate |
| `fractionalization.rs:65` | `Fractionalized` | token_id, user | total_shares, min_fraction, timestamp | Candidate |
| `fractionalization.rs:126` | `FractionTransferred` | token_id, from | to, share_amount, timestamp | Candidate |
| `fractionalization.rs:172` | `Recombined` | token_id, holder | timestamp | Candidate |
| `fractionalization.rs:289` | `DividendDistributed` | token_id, admin | total_amount, recipients, timestamp | Candidate |
| `royalty.rs:46` | `roy_set` | token_id | recipient_count, timestamp | Candidate |
| `royalty.rs:92` | `roy_paid` | token_id, recipient | payment_token, amount, timestamp | Candidate |
| `subscription.rs:172` | `sub_creat` | id, user | payment_token, amount, created_at, expires_at | Candidate |
| `subscription.rs:272` | `subscr` | id, user | PauseHistoryEntry | Candidate |
| `subscription.rs:372` | `subscr` | id, user | PauseHistoryEntry | Candidate |
| `subscription.rs:427` | `usdc_set` | usdc_address | admin, timestamp | Candidate |
| `subscription.rs:463` | `sub_cancl` | id, user | timestamp, old_status, new_status | Candidate |
| `subscription.rs:535` | `sub_renew` | id, user | payment_token, amount, old_expiry, new_expiry | Candidate |
| `subscription.rs:693` | `tier_crt` | tier_id, admin | name, level, price, timestamp | Candidate |
| `subscription.rs:747` | `tier_upd` | tier_id, admin | timestamp | Candidate |
| `subscription.rs:814` | `tier_dea` | tier_id, admin | timestamp | Candidate |
| `subscription.rs:902` | `sub_creat` | id, user | tier_id, final_price, created_at, expires_at | Candidate |
| `subscription.rs:1011` | `tier_chg` | change_id, user | from_tier, to_tier, change_type, prorated_amount | Candidate |
| `subscription.rs:1090` | `tier_cmp` | change_id, user | old_tier, new_tier, prorated_amount | Candidate |
| `subscription.rs:1135` | `tier_cnc` | change_id, user | timestamp | Candidate |
| `subscription.rs:1198` | `promo_cr` | promo_id, admin | tier_id, discount, start_date, end_date | Candidate |
| `batch.rs:25` | `bat_mint` | (none) | count, timestamp | Candidate |
| `batch.rs:44` | `bat_xfr` | (none) | count, timestamp | Candidate |
| `batch.rs:63` | `bat_upd` | (none) | count, timestamp | Candidate |
| `upgrade.rs:161` | `TokenUpgraded` | token_id, caller | from_version, to_version | Candidate |
| `attendance_log.rs:84` | `attend` | id, user_id | action | Candidate |

### `resource_credits` Contract

| Location | Event Symbol | Keys | Data | Migration Status |
|----------|-------------|------|------|-----------------|
| `lib.rs:80` | `mint` | recipient | amount | **Migrated below** |
| `lib.rs:121` | `transfer` | from, to | amount | **Migrated below** |
| `lib.rs:157` | `spend` | member | amount | **Migrated below** |

### `workspace_booking` Contract

| Location | Event Symbol | Keys | Data | Migration Status |
|----------|-------------|------|------|-----------------|
| `lib.rs:114` | `init` | (none) | admin, payment_token | **Migrated below** |
| `lib.rs:175` | `ws_reg` | id | name, type, capacity, hourly_rate | **Migrated below** |
| `lib.rs:207` | `ws_avail` | workspace_id | is_available | **Migrated below** |
| `lib.rs:236` | `ws_rate` | workspace_id | hourly_rate | **Migrated below** |
| `lib.rs:344` | `booked` | booking_id | member, workspace_id, start, end, amount | **Migrated below** |
| `lib.rs:385` | `cancel` | booking_id | caller, refund_amount | **Migrated below** |
| `lib.rs:414` | `complete` | booking_id | workspace_id, member | **Migrated below** |

### `payment_escrow` Contract

| Location | Event Symbol | Keys | Data | Migration Status |
|----------|-------------|------|------|-----------------|
| `lib.rs:114` | `init` | (none) | admin, payment_token, dispute_window | Candidate |
| `lib.rs:131` | `dw_set` | (none) | window_secs | Candidate |
| `lib.rs:218` | `created` | escrow_id | depositor, beneficiary, amount, release_after | Candidate |
| `lib.rs:247` | `released` | escrow_id | beneficiary, amount | Candidate |
| `lib.rs:274` | `refunded` | escrow_id | depositor, amount | Candidate |
| `lib.rs:313` | `disputed` | escrow_id | depositor, timestamp | Candidate |
| `lib.rs:358` | `resolved` | escrow_id | recipient, amount, release_to_beneficiary | Candidate |
| `lib.rs:400` | `claimed` | escrow_id | beneficiary, amount | Candidate |

## Migration Recommendations

### High Priority (value-handling contracts)

1. **`resource_credits`** - Credit operations (mint, transfer, spend) should use
   `#[contractevent]` for reliable off-chain indexing. These events carry financial
   data that indexers must not miss.

2. **`workspace_booking`** - Booking events (booked, cancel, complete) should use
   `#[contractevent]` for reliable booking lifecycle tracking.

3. **`manage_hub` subscription events** - Payment-related events (`sub_creat`,
   `sub_renew`, `sub_cancl`, `tier_crt`) should be migrated early.

### Medium Priority (operational events)

4. **`manage_hub` token events** - Token lifecycle events (`token_iss`, `token_xfr`,
   `token_rnw`) are important but less time-sensitive.

5. **`payment_escrow`** - Escrow events are important for fund tracking.

### Low Priority (diagnostic events)

6. **Analytics/admin events** - Tier analytics updates, metadata changes, and
   configuration events can be migrated later.

## Migration Pattern for Remaining Contracts

For contracts not yet migrated, maintain consistency by keeping `#[allow(deprecated)]`
at the top of the file and documenting the planned migration timeline. When migrating:

1. Define the event struct with `#[contractevent]` (must be in a `#[contract]` module)
2. Use typed fields instead of tuples
3. The event name defaults to the struct name (PascalCase → SnakeCase for topic)
4. Ensure all fields are `IntoVal`/`FromVal` compatible with Soroban
