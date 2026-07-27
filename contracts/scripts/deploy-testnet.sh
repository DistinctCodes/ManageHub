#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# deploy-testnet.sh — Deploy all ManageHub contracts to Stellar testnet.
#
# Usage:
#   ./contracts/scripts/deploy-testnet.sh --network testnet
#   ./contracts/scripts/deploy-testnet.sh --network futurenet
#
# Required env vars:
#   STELLAR_SECRET_KEY  — Secret key of the deployer account
#
# The script writes deployed contract IDs to .env.deployment.
# ──────────────────────────────────────────────────────────────────────────────

NETWORK="testnet"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --network) NETWORK="$2"; shift 2 ;;
        *) echo "Unknown argument: $1"; exit 1 ;;
    esac
done

if [[ -z "${STELLAR_SECRET_KEY:-}" ]]; then
    echo "ERROR: STELLAR_SECRET_KEY must be set."
    exit 1
fi

CONTRACTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${CONTRACTS_DIR}/target/wasm32v1-none/release"
ENV_FILE="${CONTRACTS_DIR}/.env.deployment"

# All contracts to deploy (in order of dependency)
CONTRACTS=(
    "access_control"
    "common_types"
    "workspace_booking"
    "payment_escrow"
    "resource_credits"
    "membership_token"
    "manage_hub"
)

# Build contracts first
echo "Building contracts for deployment..."
cd "$CONTRACTS_DIR"
cargo build --release --target wasm32v1-none

# Source the existing deployment file to check for already-deployed contracts
declare -A DEPLOYED
if [[ -f "$ENV_FILE" ]]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
        DEPLOYED["$key"]="$value"
    done < "$ENV_FILE"
fi

echo ""
echo "Deploying to ${NETWORK}..."
echo "════════════════════════════════════════════════════════════════"

for contract in "${CONTRACTS[@]}"; do
    WASM_FILE="${BUILD_DIR}/${contract}.wasm"
    ENV_KEY="CONTRACT_ID_$(echo "$contract" | tr '[:lower:]' '[:upper:]')"

    if [[ ! -f "$WASM_FILE" ]]; then
        echo "  WARN: WASM not found for ${contract}, skipping."
        continue
    fi

    # Check if already deployed (idempotent)
    if [[ -n "${DEPLOYED[$ENV_KEY]:-}" ]]; then
        echo "  SKIP: ${contract} already deployed → ${DEPLOYED[$ENV_KEY]}"
        continue
    fi

    echo -n "  Deploying ${contract}... "
    CONTRACT_ID=$(stellar contract deploy \
        --wasm "$WASM_FILE" \
        --source "$STELLAR_SECRET_KEY" \
        --network "$NETWORK" \
        --alias "$contract" 2>&1) || {
            echo "FAILED"
            echo "  ERROR: $CONTRACT_ID"
            continue
        }
    echo "OK → ${CONTRACT_ID}"

    # Persist to .env.deployment
    echo "${ENV_KEY}=${CONTRACT_ID}" >> "$ENV_FILE"
done

echo "════════════════════════════════════════════════════════════════"
echo "Deployment complete. Contract IDs written to:"
echo "  ${ENV_FILE}"
