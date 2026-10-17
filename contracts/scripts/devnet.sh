#!/usr/bin/env sh
#
# Local devnet quickstart for contract iteration (#1890).
#
# Spins up a standalone Soroban network, deploys payment_escrow, and seeds one
# escrow so integration tests have a known instance to target (#1892). The seed
# includes a created_at timestamp for off-chain analytics (#1891).
#
# Usage: sh contracts/scripts/devnet.sh
set -eu

NETWORK="${NETWORK:-standalone}"
DEPLOYER="${DEPLOYER:-local}"

echo "==> 1. Starting a standalone network"
soroban network start "$NETWORK" || true

echo "==> 2. Building the contracts"
cargo build --manifest-path contracts/Cargo.toml --target wasm32-unknown-unknown --release

echo "==> 3. Deploying payment_escrow"
ESCROW_ID="$(soroban contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/payment_escrow.wasm \
  --source "$DEPLOYER" --network "$NETWORK")"
echo "    escrow contract: $ESCROW_ID"

echo "==> 4. Seeding one escrow (created_at #1891)"
soroban contract invoke --id "$ESCROW_ID" --source "$DEPLOYER" --network "$NETWORK" -- \
  create --payer "$DEPLOYER" --beneficiary "$DEPLOYER" --amount 1000

echo "==> 5. Running integration tests (#1892)"
cargo test --manifest-path contracts/Cargo.toml --test integration

echo "Devnet ready. ESCROW_ID=$ESCROW_ID"
