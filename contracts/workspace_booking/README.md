# Workspace Booking Contract

## Overview

The `workspace_booking` contract manages reservation of physical and virtual workspaces. Members can book time slots for hot desks, dedicated desks, private offices, meeting rooms, and hybrid spaces. The contract enforces non-overlapping active bookings per workspace, handles payment collection via a configurable payment token, and supports full refunds on cancellation.

## Architecture

```
src/
├── lib.rs              — Contract entry points and core logic
├── types.rs            — Workspace, Booking, BookingStatus, WorkspaceType definitions
├── errors.rs           — Error codes (1–99 core, 100–199 booking, 200–299 workspace)
├── test.rs             — Unit tests
└── proptest_tests.rs   — Property-based tests (booking conflicts, cancellations, status transitions)
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `Admin` | `Address` | Contract administrator |
| `PaymentToken` | `Address` | Accepted payment token address |
| `Workspace(String)` | `Workspace` | Workspace record by ID |
| `WorkspaceList` | `Vec<String>` | All registered workspace IDs |
| `Booking(String)` | `Booking` | Booking record by ID |
| `WorkspaceBookings(String)` | `Vec<String>` | Booking IDs per workspace |
| `MemberBookings(Address)` | `Vec<String>` | Booking IDs per member |

## Functions

### Initialization

```rust
fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error>
```

One-time setup. Sets the admin and payment token addresses.

### Workspace Management (Admin Only)

```rust
fn register_workspace(env, caller, id, name, workspace_type, capacity, hourly_rate) -> Result<(), Error>
fn set_workspace_availability(env, caller, workspace_id, is_available) -> Result<(), Error>
fn set_workspace_rate(env, caller, workspace_id, hourly_rate) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `String` | Unique workspace identifier |
| `name` | `String` | Human-readable name |
| `workspace_type` | `WorkspaceType` | `HotDesk`, `DedicatedDesk`, `PrivateOffice`, `MeetingRoom`, `Virtual`, `Hybrid` |
| `capacity` | `u32` | Max simultaneous occupants (≥ 1) |
| `hourly_rate` | `u128` | Price per hour in smallest payment-token units |

### Booking

```rust
fn book_workspace(env, member, booking_id, workspace_id, start_time, end_time) -> Result<(), Error>
fn cancel_booking(env, caller, booking_id) -> Result<(), Error>
fn complete_booking(env, caller, booking_id) -> Result<(), Error>
```

- `book_workspace` — Collects payment (rounded up to nearest hour). Errors if the slot overlaps an existing active booking.
- `cancel_booking` — Full refund to member. Only booking member or admin can cancel.
- `complete_booking` — Admin marks a booking as completed.

### Queries

```rust
fn get_workspace(env, workspace_id) -> Result<Workspace, Error>
fn get_booking(env, booking_id) -> Result<Booking, Error>
fn get_all_workspaces(env) -> Vec<String>
fn get_member_bookings(env, member) -> Vec<String>
fn get_workspace_bookings(env, workspace_id) -> Vec<String>
fn check_availability(env, workspace_id, start_time, end_time) -> bool
fn admin(env) -> Result<Address, Error>
fn payment_token(env) -> Result<Address, Error>
```

## Example Usage

```rust
// Register a workspace
client.register_workspace(
    &admin,
    &String::from_str(&env, "ws-001"),
    &String::from_str(&env, "Hot Desk A"),
    &WorkspaceType::HotDesk,
    &1u32,
    &500u128,
);

// Book the workspace (2 hours starting from now+60s)
let now = env.ledger().timestamp();
client.book_workspace(
    &member,
    &String::from_str(&env, "booking-001"),
    &String::from_str(&env, "ws-001"),
    &(now + 60),
    &(now + 7260),
);

// Check availability
assert!(!client.check_availability(
    &String::from_str(&env, "ws-001"),
    &(now + 60),
    &(now + 7260),
));

// Cancel and refund
client.cancel_booking(&member, &String::from_str(&env, "booking-001"));
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AdminNotSet` | No admin configured |
| 2 | `Unauthorized` | Caller not authorized |
| 3 | `AlreadyInitialized` | Contract already initialized |
| 4 | `PaymentTokenNotSet` | Payment token not configured |
| 8 | `InvalidTimeRange` | Invalid booking time window |
| 100 | `BookingNotFound` | Booking ID not found |
| 101 | `BookingAlreadyExists` | Booking ID already taken |
| 102 | `BookingConflict` | Booking overlaps with existing active booking |
| 103 | `BookingNotActive` | Booking must be Active for this operation |
| 200 | `WorkspaceNotFound` | Workspace ID not found |
| 201 | `WorkspaceAlreadyExists` | Workspace ID already registered |
| 202 | `WorkspaceUnavailable` | Workspace cannot accept new bookings |

## Testing

```bash
cargo test -p workspace_booking
```
