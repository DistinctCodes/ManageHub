# Membership Token Contract

A Soroban (Stellar) smart contract for issuing, transferring, and querying time-bound membership tokens in the ManageHub ecosystem.

## Overview

Each membership token is identified by a unique 32-byte ID and has:

- **Owner** – the address that currently holds the token.
- **Status** – `Active` or `Expired`.
- **Issue date** – timestamp when the token was minted.
- **Expiry date** – timestamp after which the token is no longer valid.

## Functions

| Function | Auth | Description |
|---|---|---|
| `set_admin(admin)` | `admin` | Set or replace the contract administrator. |
| `issue_token(id, user, expiry_date)` | admin | Mint a new membership token. |
| `transfer_token(id, new_user)` | current owner | Transfer token ownership. |
| `get_token(id)` | none | Retrieve token details; returns `TokenExpired` if past expiry. |

## Binary Target

`src/bin/membership-token.rs` is a **placeholder binary** used solely for contract deployment tooling. It prints the contract name and exits. It is not used at runtime on-chain.

## Error Codes

| Code | Name | Meaning |
|---|---|---|
| 1 | `AdminNotSet` | No admin has been configured yet. |
| 2 | `TokenAlreadyIssued` | A token with this ID already exists. |
| 3 | `InvalidExpiryDate` | Expiry date must be in the future. |
| 4 | `TokenNotFound` | No token with the given ID exists. |
| 5 | `TokenExpired` | Token has expired or an inactive token was queried. |

## Running Tests

```bash
cargo test -p membership_token
```

## Building

```bash
cargo build --target wasm32-unknown-unknown --release -p membership_token
```
