# Resource Credits Contract

## Overview

The `resource_credits` contract implements a credit system for the ManageHub platform. Credits can be minted by an admin, transferred between members, and spent (burned) by members to pay for services. Total supply is tracked and updated on every mint and spend operation.

## Architecture

```
src/
├── lib.rs              — Contract entry points and credit logic
├── types.rs            — TransactionType, CreditTransaction, CreditBalance definitions
├── errors.rs           — Error codes
└── proptest_tests.rs   — Property-based tests (negative balance, supply invariant, transfer conservation)
```

### Storage Keys

| Key | Type | Description |
|-----|------|-------------|
| `Admin` | `Address` | Contract administrator |
| `PaymentToken` | `Address` | Associated payment token |
| `Balance(Address)` | `u128` | Credit balance per member |
| `TotalSupply` | `u128` | Total credits in circulation |

## Credit Flow

```
         ┌─────────┐
         │  Admin   │
         └────┬─────┘
              │ mint_credits
              ▼
    ┌──────────────────┐
    │  Member Balance   │◄──── spend_credits (burn)
    │  (TotalSupply)    │
    └──────┬────────────┘
           │ transfer_credits
           ▼
    ┌──────────────────┐
    │  Recipient        │
    │  Balance          │
    └──────────────────┘
```

## Functions

### Initialization

```rust
fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error>
```

### Minting (Admin Only)

```rust
fn mint_credits(env: Env, caller: Address, recipient: Address, amount: u128) -> Result<(), Error>
```

Increases recipient balance and `TotalSupply`.

### Transfers

```rust
fn transfer_credits(env: Env, from: Address, to: Address, amount: u128) -> Result<(), Error>
```

Decrements sender balance, increments recipient balance. `TotalSupply` is unchanged.

### Spending (Burning)

```rust
fn spend_credits(env: Env, member: Address, amount: u128) -> Result<(), Error>
```

Decrements member balance and `TotalSupply`. Errors if balance is insufficient.

### Queries

```rust
fn balance(env: Env, member: Address) -> u128
fn total_supply(env: Env) -> u128
```

## Properties (Verified by Proptest)

1. **No negative balance:** `spend_credits` always errors if `amount > balance`, and balance never underflows.
2. **Supply invariant:** Sum of all user balances equals `TotalSupply` at all times.
3. **Transfer preserves supply:** `transfer_credits` does not change `TotalSupply`.

## Example Usage

```rust
// Admin mints 10,000 credits to a member
client.mint_credits(&admin, &member, &10_000u128);
assert_eq!(client.total_supply(), 10_000);
assert_eq!(client.balance(&member), 10_000);

// Member transfers 2,000 credits to another user
client.transfer_credits(&member, &recipient, &2_000u128);
assert_eq!(client.balance(&member), 8_000);
assert_eq!(client.balance(&recipient), 2_000);
assert_eq!(client.total_supply(), 10_000); // unchanged

// Member spends 500 credits (burned)
client.spend_credits(&member, &500u128);
assert_eq!(client.balance(&member), 7_500);
assert_eq!(client.total_supply(), 9_500); // decreased
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AdminNotSet` | No admin configured |
| 2 | `AlreadyInitialized` | Contract already initialized |
| 3 | `Unauthorized` | Caller is not the admin |
| 4 | `InsufficientBalance` | Member balance too low |
| 5 | `InvalidAmount` | Amount must be > 0 |
| 6 | `AccountNotFound` | Account not in storage |

## Testing

```bash
cargo test -p resource_credits
```
