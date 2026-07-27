# Storage TTL Audit (SC-10)

Audited: 2026-07-26

## Summary

Soroban persistent storage entries expire after a default TTL if not extended.
All contracts below now have explicit `bump` / `extend_ttl` calls on every
persistent write path, with TTL constants chosen to match data lifetime.

| Storage Class | Default TTL | Needs Bump? |
|---|---|---|
| `instance` | Lives as long as the contract | No |
| `persistent` | ~14 days (2,016,000 ledgers) | Yes, for active data |
| `temporary` | 409,600 ledgers (~23 days) | By design |

## TTL Constants

| Constant | Value (ledgers) | Approx. Days | Used For |
|---|---|---|---|
| `STAKE_TTL_LEDGERS` | 518,400 | ~30 | Staking stakes |
| `UPGRADE_HISTORY_TTL_LEDGERS` | 1,555,200 | ~90 | Upgrade history |
| `VERSION_SNAPSHOT_TTL_LEDGERS` | 1,555,200 | ~90 | Version snapshots |
| `TOKEN_TTL_LEDGERS` | 1,555,200 | ~90 | Membership tokens |
| `BALANCE_TTL_LEDGERS` | 1,555,200 | ~90 | Credit balances |
| `BOOKING_TTL_LEDGERS` | 518,400 | ~30 | Workspace bookings |
| `SUBSCRIPTION_TTL_LEDGERS` | 518,400 | ~30 | Subscriptions |
| `TIER_TTL_LEDGERS` | 1,555,200 | ~90 | Subscription tiers |
| `LOG_TTL_LEDGERS` | 518,400 | ~30 | Attendance logs |
| `PROMO_TTL_LEDGERS` | 518,400 | ~30 | Promotions |

## Per-Contract Findings

### resource_credits

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `Balance(addr)` | persistent | No | **Yes** |
| `TotalSupply` | instance | N/A | — |
| `Admin` | instance | N/A | — |
| `PaymentToken` | instance | N/A | — |

### workspace_booking

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `Workspace(id)` | persistent | No | **Yes** |
| `Booking(id)` | persistent | No | **Yes** |
| `MemberBookings(addr)` | persistent | No | **Yes** |
| `WorkspaceBookings(id)` | persistent | No | **Yes** |
| `WorkspaceList` | instance | N/A | — |
| `Admin` | instance | N/A | — |
| `PaymentToken` | instance | N/A | — |

### membership_token (standalone crate)

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `Token(id)` | persistent | No | **Yes** |
| `Metadata(id)` | persistent | No | **Yes** |
| `MetadataHistory(id)` | persistent | No | **Yes** |
| `MetadataIndex(k,v)` | persistent | No | **Yes** |
| `RenewalConfig` | instance | N/A | — |
| `EmergencyPauseState` | instance | N/A | — |

### manage_hub/membership_token.rs

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `Token(id)` | persistent | No | **Yes** |
| `Metadata(id)` | persistent | No | **Yes** |
| `MetadataHistory(id)` | persistent | No | **Yes** |
| `MetadataIndex(k,v)` | persistent | No | **Yes** |
| `RenewalHistory(token_id)` | persistent | Yes (100/1000) | Low — **increased** |
| `AutoRenewalSettings(addr)` | persistent | No | **Yes** |
| `TokenPaused(id)` | persistent | No | **Yes** |

### manage_hub/subscription.rs

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `Subscription(id)` | persistent | Yes (100/1000) | OK but **increased** |
| `Tier(id)` | persistent | Yes (100/1000) | OK but **increased** |
| `TierList` | persistent | No | **Yes** |
| `TierPromotion(id)` | persistent | No | **Yes** |
| `TierPromotionList` | persistent | No | **Yes** |
| `TierChangeRequest(id)` | persistent | No | **Yes** |
| `UserTierChangeHistory(addr)` | persistent | No | **Yes** |
| `TierAnalytics(id)` | persistent | No | **Yes** |

### manage_hub/attendance_log.rs

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `AttendanceLog(id)` | persistent | No | **Yes** |
| `AttendanceLogsByUser(addr)` | persistent | No | **Yes** |

### manage_hub/fractionalization.rs

| Key | Storage | Had Bump? | Fixed? |
|---|---|---|---|
| `FractionInfo(id)` | persistent | No | **Yes** |
| `FractionShares(id)` | persistent | No | **Yes** |
| `PendingRewards(id)` | persistent | No | **Yes** |

### manage_hub/staking.rs — Already OK

`Stake(addr)` already calls `extend_ttl` with `STAKE_TTL_LEDGERS` in `save_stake`.
Tier data (`Tier(id)`) is persistent without a bump — **added**.

### manage_hub/upgrade.rs — Already OK

Both `UpgradeHistory` and `VersionSnapshot` already use `extend_ttl` with
`UPGRADE_HISTORY_TTL_LEDGERS` / `VERSION_SNAPSHOT_TTL_LEDGERS`.

### staking_rewards — Already OK

`Stake(addr)` already calls `extend_ttl` with `STAKE_TTL_LEDGERS` in `save_stake`.
Tier data — **added**.
