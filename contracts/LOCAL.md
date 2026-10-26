# Local Soroban Contracts Sandbox

This document details how to run, deploy, and interact with the ManageHub Soroban smart contracts locally against a standalone Stellar Quickstart node, eliminating reliance on public testnet rate limits, faucet availability, and network latency.

---

## Overview

The local sandbox environment provisions:
- A standalone Stellar network running inside Docker (`stellar/quickstart:testing`).
- A local Horizon instance (`http://localhost:8000`) and Soroban RPC endpoint (`http://localhost:8000/soroban/rpc`).
- Local test keypairs funded via local Friendbot.
- A compiled and deployed instance of the `payment_escrow` smart contract.
- Verified `create` and `release` lifecycle invocations.
- Copy-pasteable environment configuration for the NestJS backend (`backend/.env`).

---

## Network Architecture & Endpoints

| Component | Endpoint / Value |
|---|---|
| **Horizon API** | `http://localhost:8000` |
| **Soroban RPC** | `http://localhost:8000/soroban/rpc` |
| **Friendbot Faucet** | `http://localhost:8000/friendbot` |
| **Network Passphrase** | `Standalone Network ; February 2017` |
| **CLI Network Name** | `standalone` |

---

## Prerequisites

1. **Docker Engine / Docker Desktop** (running and accessible by current user).
2. **Rust Toolchain**: Rust 1.98.1 with the `wasm32-unknown-unknown` target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
3. **Stellar CLI**:
   ```bash
   cargo install --locked stellar-cli
   ```
   Verify installation:
   ```bash
   stellar --version
   ```

---

## Quickstart (Automated Sandbox)

You can launch the entire local sandbox with a single command from the repository root:

```bash
make sandbox
```

Or execute the script directly:
```bash
bash contracts/scripts/sandbox.sh
```

### What this does:
1. Verifies local `docker` and `stellar` CLI dependencies.
2. Starts a `stellar/quickstart:testing` container exposing port `8000`.
3. Waits for the Soroban RPC healthcheck (`/soroban/rpc`) to return `healthy`.
4. Adds the `standalone` network profile to your Stellar CLI configuration.
5. Generates and funds two local test accounts: `sandbox-deployer` (payer & admin) and `sandbox-beneficiary`.
6. Compiles `contracts/payment_escrow` to WebAssembly (`wasm32-unknown-unknown`).
7. Deploys `payment_escrow` to the local standalone network and initialises the admin.
8. Resolves the native Stellar asset (XLM) contract address.
9. Executes an end-to-end escrow lifecycle:
   - Invokes `create` to deposit funds into escrow.
   - Asserts status is `1` (`LOCKED`).
   - Invokes `release` to disburse funds to the beneficiary.
   - Asserts status is `2` (`RELEASED`).
10. Prints the exact `.env` configuration lines needed by the backend.

### Stopping the Sandbox
To stop and remove the standalone Docker container:
```bash
make sandbox ARGS=--stop
# or
bash contracts/scripts/sandbox.sh --stop
```

---

## Manual Step-by-Step Guide

If you prefer to run the steps manually or inspect each phase:

### 1. Start the Standalone Docker Node

```bash
docker run -d --rm \
  --name stellar-sandbox \
  -p 8000:8000 \
  stellar/quickstart:testing \
  --standalone \
  --enable-soroban-rpc
```

Verify that the Soroban RPC is responding:
```bash
curl -s -X POST http://localhost:8000/soroban/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```
Response should contain `"status": "healthy"`.

### 2. Configure the Stellar CLI Network Profile

```bash
stellar network add \
  --global standalone \
  --rpc-url "http://localhost:8000/soroban/rpc" \
  --network-passphrase "Standalone Network ; February 2017"
```

### 3. Generate and Fund Local Identities

Create an operator/deployer account and a beneficiary account:
```bash
# Generate keys
stellar keys generate --global alice --network standalone
stellar keys generate --global bob --network standalone

# Fund keys with friendbot
stellar keys fund alice --network standalone
stellar keys fund bob --network standalone
```

Inspect addresses and secret keys:
```bash
export ALICE_ADDR="$(stellar keys address alice)"
export BOB_ADDR="$(stellar keys address bob)"
export ALICE_SECRET="$(stellar keys secret alice)"
echo "Alice (Deployer/Payer): $ALICE_ADDR"
echo "Bob (Beneficiary):      $BOB_ADDR"
```

### 4. Build and Deploy `payment_escrow`

```bash
# Build contracts workspace
cd contracts
cargo build --release --target wasm32-unknown-unknown
cd ..

# Deploy payment_escrow
export ESCROW_CONTRACT_ID="$(stellar contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/payment_escrow.wasm \
  --source alice \
  --network standalone)"
echo "Deployed ESCROW_CONTRACT_ID: $ESCROW_CONTRACT_ID"

# Initialise admin
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source alice \
  --network standalone \
  -- initialize --admin "$ALICE_ADDR"
```

### 5. Resolve Native Asset Contract

Stellar contracts handle XLM payments through the native asset contract wrapper:
```bash
export TOKEN_CONTRACT_ID="$(stellar contract id asset --asset native --network standalone)"
echo "Native Token Contract ID: $TOKEN_CONTRACT_ID"
```

### 6. Execute End-to-End Escrow Lifecycle

#### A. Create Escrow
Generate a 32-byte hex string (SHA-256 equivalent) for the escrow ID:
```bash
export ESCROW_ID="0101010101010101010101010101010101010101010101010101010101010101"
```

Invoke `create` (locks 1.0 XLM = `10000000` stroops):
```bash
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source alice \
  --network standalone \
  -- create \
  --escrow_id "$ESCROW_ID" \
  --payer "$ALICE_ADDR" \
  --beneficiary "$BOB_ADDR" \
  --amount 10000000 \
  --token "$TOKEN_CONTRACT_ID"
```

#### B. Check Status (Locked)
Verify that the escrow status is `1` (`LOCKED`):
```bash
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source alice \
  --network standalone \
  -- get_status --escrow_id "$ESCROW_ID"
```
Output:
```
1
```

#### C. Release Escrow
Release the funds from the contract to Bob:
```bash
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source alice \
  --network standalone \
  -- release \
  --escrow_id "$ESCROW_ID"
```

#### D. Check Status (Released)
Verify that the status is now `2` (`RELEASED`):
```bash
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source alice \
  --network standalone \
  -- get_status --escrow_id "$ESCROW_ID"
```
Output:
```
2
```

---

## Backend Configuration (`backend/.env`)

To point the NestJS backend to your local sandbox node, update `backend/.env` with:

```env
# Activate the Soroban on-chain escrow rail
SOROBAN_ENABLED=true

# Contract and Identity Config
STELLAR_ESCROW_CONTRACT_ID=<ESCROW_CONTRACT_ID>
STELLAR_SECRET_KEY=<ALICE_SECRET_KEY>
STELLAR_BENEFICIARY_ADDRESS=<BOB_ADDRESS>

# Standalone Network Settings
STELLAR_NETWORK="Standalone Network ; February 2017"
STELLAR_HORIZON_URL=http://localhost:8000
STELLAR_RPC_URLS=http://localhost:8000/soroban/rpc

# Optional: Poll & Timeout Settings
SOROBAN_RPC_TIMEOUT_MS=10000
SOROBAN_POLL_TIMEOUT_MS=15000
SOROBAN_POLL_INTERVAL_MS=2000
```

---

## Pointing Backend Integration Specs at Local Sandbox

The backend integration spec at [`backend/src/payments/soroban/testnet-integration.spec.ts`](../backend/src/payments/soroban/testnet-integration.spec.ts) can be run locally against the standalone sandbox instead of the public testnet.

Set the following environment variables:
```bash
export RUN_SOROBAN_TESTNET_TESTS=true
export SOROBAN_TESTNET_ESCROW_CONTRACT_ID="<ESCROW_CONTRACT_ID>"
```

And run Jest:
```bash
cd backend
npm test -- src/payments/soroban/testnet-integration.spec.ts
```

This validates contract interaction through NestJS clients without consuming public testnet faucet quotas.
