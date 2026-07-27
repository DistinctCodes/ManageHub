# Payment Escrow Contract

## Overview

The `payment_escrow` contract manages locked-fund records between a depositor and a beneficiary. Funds are held in escrow until released by admin, claimed by the beneficiary after a time-lock, or refunded by admin. A configurable dispute window allows the depositor to raise disputes within a deadline, after which the admin must resolve.

## Architecture

```
src/
├── lib.rs      — Contract entry points and escrow lifecycle logic
├── types.rs    — Escrow, EscrowStatus definitions
├── errors.rs   — Error codes
└── test.rs     — Unit tests
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `Admin` | `Address` | Contract administrator |
| `PaymentToken` | `Address` | Accepted payment token |
| `DefaultDisputeWindow` | `u64` | Default dispute window (seconds) |
| `Escrow(String)` | `Escrow` | Escrow record by ID |
| `DepositorEscrows(Address)` | `Vec<String>` | Escrow IDs per depositor |
| `BeneficiaryEscrows(Address)` | `Vec<String>` | Escrow IDs per beneficiary |

## Escrow Lifecycle

```
                    ┌─────────────────────────────────┐
                    │           Pending                │
                    │  (funds locked in contract)      │
                    └────┬──────────┬──────────┬──────┘
                         │          │          │
              admin release   admin refund   dispute raised
                         │          │          │
                         ▼          ▼          ▼
                    Released   Refunded   Disputed
                                                │
                                      admin resolve
                                        ┌───────┴───────┐
                                        ▼               ▼
                                   Released        Refunded
```

**Auto-claim:** If `release_after > 0`, the beneficiary may call `claim()` after that timestamp without admin approval.

## Functions

### Initialization

```rust
fn initialize(env: Env, admin: Address, payment_token: Address, dispute_window_secs: u64) -> Result<(), Error>
```

### Admin Configuration

```rust
fn set_dispute_window(env: Env, caller: Address, window_secs: u64) -> Result<(), Error>
```

### Escrow Creation

```rust
fn create_escrow(env, depositor, escrow_id, beneficiary, amount, description, release_after) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `depositor` | `Address` | Address locking the funds |
| `escrow_id` | `String` | Unique ID (caller-provided) |
| `beneficiary` | `Address` | Address that receives funds on release |
| `amount` | `i128` | Tokens to lock (> 0) |
| `description` | `String` | Human-readable purpose |
| `release_after` | `u64` | Unix timestamp after which auto-claim is allowed (0 = disabled) |

### Admin Operations

```rust
fn release(env: Env, caller: Address, escrow_id: String) -> Result<(), Error>
fn refund(env: Env, caller: Address, escrow_id: String) -> Result<(), Error>
fn resolve_dispute(env, caller, escrow_id, release_to_beneficiary) -> Result<(), Error>
```

### Dispute Flow

```rust
fn raise_dispute(env: Env, caller: Address, escrow_id: String) -> Result<(), Error>
```

Only the depositor may raise a dispute, and only within the escrow's dispute window.

### Beneficiary Self-Claim

```rust
fn claim(env: Env, caller: Address, escrow_id: String) -> Result<(), Error>
```

Available when `release_after > 0` and the timestamp has been reached.

### Queries

```rust
fn get_escrow(env, escrow_id) -> Result<Escrow, Error>
fn get_depositor_escrows(env, depositor) -> Vec<String>
fn get_beneficiary_escrows(env, beneficiary) -> Vec<String>
fn admin(env) -> Result<Address, Error>
fn payment_token(env) -> Result<Address, Error>
fn dispute_window(env) -> u64
```

## Example Usage

```rust
// Create an escrow
client.create_escrow(
    &depositor,
    &String::from_str(&env, "escrow-001"),
    &beneficiary,
    &10_000i128,
    &String::from_str(&env, "Security deposit"),
    &(env.ledger().timestamp() + 86400), // auto-claim after 24h
);

// Admin releases to beneficiary
client.release(&admin, &String::from_str(&env, "escrow-001"));

// Or refund to depositor
client.refund(&admin, &String::from_str(&env, "escrow-001"));
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AdminNotSet` | No admin configured |
| 2 | `Unauthorized` | Caller not authorized |
| 3 | `AlreadyInitialized` | Contract already initialized |
| 4 | `EscrowNotFound` | Escrow ID not found |
| 5 | `EscrowAlreadyExists` | Escrow ID already taken |
| 6 | `EscrowNotPending` | Action requires Pending status |
| 7 | `EscrowNotDisputed` | Action requires Disputed status |
| 8 | `DisputeWindowClosed` | Too late to raise dispute |
| 9 | `ClaimTooEarly` | `release_after` timestamp not reached |
| 10 | `AutoClaimDisabled` | `release_after` is 0 |
| 11 | `InvalidAmount` | Amount must be > 0 |
| 12 | `PaymentTokenNotSet` | Payment token not configured |

## Testing

```bash
cargo test -p payment_escrow
```
