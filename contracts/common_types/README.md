# Common Types Library

## Overview

The `common_types` crate provides shared type definitions used across all ManageHub smart contracts. It ensures consistency for subscription management, attendance tracking, token metadata, and user role definitions.

## Architecture

```
src/
├── lib.rs          — Re-exports all public types
├── types.rs        — All type definitions and validation functions
└── test_contract.rs — Unit tests
```

## Types Catalog

### Subscription Types

| Type | Variants | Description |
|------|----------|-------------|
| `SubscriptionPlan` | `Daily`, `Monthly`, `PayPerUse` | Billing frequency options |
| `TierLevel` | `Free`, `Basic`, `Pro`, `Enterprise` | Subscription tier hierarchy |
| `TierFeature` | `BasicAccess`, `PrioritySupport`, `AdvancedAnalytics`, `CustomBranding`, `ApiAccess`, `UnlimitedStorage`, `TeamManagement`, `WhiteLabel` | Feature flags per tier |
| `TierChangeType` | `Upgrade`, `Downgrade`, `Lateral` | Type of tier change |
| `TierChangeStatus` | `Pending`, `Approved`, `Completed`, `Cancelled`, `Rejected` | Tier change request status |

### Token Metadata Types

| Type | Description |
|------|-------------|
| `MetadataValue` | Enum: `Text(String)`, `Number(i128)`, `Boolean(bool)`, `Timestamp(u64)` |
| `TokenMetadata` | Complete metadata with description, attributes map, version, last update |
| `MetadataUpdate` | Versioned metadata change record |

### User & Membership Types

| Type | Variants | Description |
|------|----------|-------------|
| `UserRole` | `Member`, `Staff`, `Admin`, `Visitor` | Permission levels |
| `MembershipStatus` | `Active`, `Paused`, `GracePeriod`, `Expired`, `Revoked`, `Inactive` | Membership lifecycle |

### Attendance Types

| Type | Description |
|------|-------------|
| `AttendanceAction` | `ClockIn` or `ClockOut` |
| `TimePeriod` | `Daily`, `Weekly`, `Monthly`, `Custom` |
| `DateRange` | `start_time` / `end_time` timestamps |
| `UserAttendanceStats` | Comprehensive attendance statistics |
| `AttendanceFrequency` | Frequency metrics for a time period |
| `PeakHourData` | Hour-of-day attendance distribution |
| `DayPattern` | Day-of-week attendance distribution |

### Subscription Tier Types

| Type | Description |
|------|-------------|
| `SubscriptionTier` | Full tier definition with pricing and features |
| `TierPromotion` | Promotional pricing for a tier |
| `TierChangeRequest` | Tier upgrade/downgrade request |

## Validation Functions

```rust
pub fn validate_metadata(metadata: &TokenMetadata) -> Result<(), &'static str>
pub fn validate_attribute(key: &String, value: &MetadataValue) -> Result<(), &'static str>
```

### Validation Limits

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_DESCRIPTION_LENGTH` | 500 | Max chars for token description |
| `MAX_ATTRIBUTES_COUNT` | 20 | Max custom attributes per token |
| `MAX_ATTRIBUTE_KEY_LENGTH` | 50 | Max chars for attribute key |
| `MAX_TEXT_VALUE_LENGTH` | 200 | Max chars for text attribute value |

## Usage in Other Contracts

```toml
[dependencies]
common_types = { path = "../common_types" }
```

```rust
use common_types::{TierLevel, TierFeature, MembershipStatus};

pub fn check_tier_level(level: &TierLevel) -> bool {
    matches!(level, TierLevel::Pro | TierLevel::Enterprise)
}
```

## Testing

```bash
cargo test -p common_types
```
