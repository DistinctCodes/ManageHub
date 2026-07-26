#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# deploy-local.sh — Deploy all ManageHub contracts to local Stellar stand-alone.
#
# Usage:
#   ./contracts/scripts/deploy-local.sh
#
# Prerequisites:
#   - stellar stand-alone must be running (stellar network start --local)
#   - A local identity must exist (stellar keys generate myaccount --network standalone)
#
# The script writes deployed contract IDs to .env.deployment.local
# ──────────────────────────────────────────────────────────────────────────────

CONTRACTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${CONTRACTS_DIR}/target/wasm32v1-none/release"
ENV_FILE="${CONTRACTS_DIR}/.env.deployment.local"
NETWORK="standalone"
SOURCE="${LOCAL_SOURCE:-myaccount}"

CONTRACTS=(
    "access_control"
    "common_types"
    "workspace_booking"
    "payment_escrow"
    "resource_credits"
    "membership_token"
    "manage_hub"
)

echo "Building contracts for local deployment..."
cd "$CONTRACTS_DIR"
cargo build --release --target wasm32v1-none

# Source existing deployment file
declare -A DEPLOYED
if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        DEPLOYED["$key"]="$value"
    done < "$ENV_FILE"
fi

echo ""
echo "Deploying to local stand-alone network..."
echo "════════════════════════════════════════════════════════════════"

for contract in "${CONTRACTS[@]}"; do
    WASM_FILE="${BUILD_DIR}/${contract}.wasm"
    ENV_KEY="CONTRACT_ID_$(echo "$contract" | tr '[:lower:]' '[:upper:]')"

    if [[ ! -f "$WASM_FILE" ]]; then
        echo "  WARN: WASM not found for ${contract}, skipping."
        continue
    fi

    if [[ -n "${DEPLOYED[$ENV_KEY]:-}" ]]; then
        echo "  SKIP: ${contract} already deployed → ${DEPLOYED[$ENV_KEY]}"
        continue
    fi

    echo -n "  Deploying ${contract}... "
    CONTRACT_ID=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --source "$SOURCE" \
        --network "$NETWORK" \
        --alias "$contract" 2>&1) || {
            echo "FAILED"
            echo "  ERROR: $CONTRACT_ID"
            continue
        }
    echo "OK → ${CONTRACT_ID}"

    echo "${ENV_KEY}=${CONTRACT_ID}" >> "$ENV_FILE"
done

echo "════════════════════════════════════════════════════════════════"
echo "Local deployment complete. Contract IDs written to:"
echo "  ${ENV_FILE}"
