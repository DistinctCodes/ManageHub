# ManageHub Contracts — Deployment Guide

## Prerequisites

### Required Tools

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| WASM target | — | `rustup target add wasm32v1-none` |
| Stellar CLI | ≥ 23.1 | `brew install stellar-cli` or `cargo install --locked stellar-cli@23.1.3` |

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `STELLAR_SECRET_KEY` | Secret key for the deployer account (testnet/futurenet) | `S...` |
| `LOCAL_SOURCE` | Name of the local identity (standalone only) | `myaccount` |

## Contracts Deployed

| Contract | WASM File | Purpose |
|----------|-----------|---------|
| `access_control` | `access_control.wasm` | RBAC, multisig, role management |
| `common_types` | `common_types.wasm` | Shared type definitions |
| `workspace_booking` | `workspace_booking.wasm` | Workspace reservation system |
| `payment_escrow` | `payment_escrow.wasm` | Payment escrow lifecycle |
| `resource_credits` | `resource_credits.wasm` | Credit minting, transfer, spending |
| `membership_token` | `membership_token.wasm` | NFT membership tokens |
| `manage_hub` | `manage_hub.wasm` | Main hub contract (subscriptions, staking, upgrades) |

## Deploy to Testnet

```bash
# Set your deployer secret key
export STELLAR_SECRET_KEY="S..."

# Deploy to testnet
./contracts/scripts/deploy-testnet.sh --network testnet

# Or deploy to futurenet
./contracts/scripts/deploy-testnet.sh --network futurenet
```

Contract IDs are written to `contracts/.env.deployment`.

## Deploy to Futurenet

```bash
export STELLAR_SECRET_KEY="S..."

./contracts/scripts/deploy-testnet.sh --network futurenet
```

## Deploy Locally (Standalone)

```bash
# Start the local network
stellar network start --local

# Generate a local identity (if needed)
stellar keys generate myaccount --network standalone

# Deploy (uses LOCAL_SOURCE=myaccount by default)
./contracts/scripts/deploy-local.sh

# Or specify a custom identity
LOCAL_SOURCE=alice ./contracts/scripts/deploy-local.sh
```

Contract IDs are written to `contracts/.env.deployment.local`.

## Idempotency

Both scripts are idempotent. If a contract is already present in the deployment
file, the script skips it. To force a redeploy, remove the corresponding line
from the `.env.deployment` file.

## Post-Deployment Initialization

After deploying, each contract that requires initialization must be called.
Example for `workspace_booking`:

```bash
stellar contract invoke \
    --id <WORKSPACE_BOOKING_CONTRACT_ID> \
    --source-account myaccount \
    --network testnet \
    -- initialize \
    --admin <ADMIN_ADDRESS> \
    --payment-token <USDC_CONTRACT_ADDRESS>
```

## Build WASM Only

```bash
cd contracts
cargo build --release --target wasm32v1-none
```

Output is in `contracts/target/wasm32v1-none/release/`.

## Track WASM Sizes

```bash
./contracts/scripts/track-wasm-size.sh          # report sizes
./contracts/scripts/track-wasm-size.sh --check   # fail if > 500 KB
```
