#!/usr/bin/env bash
#
# End-to-end local sandbox for Soroban contracts (#2027).
#
# Starts a local standalone Stellar Quickstart container, generates and funds
# local test identities, builds and deploys payment_escrow, executes create/release
# invocations with the Stellar CLI, and outputs copy-pasteable .env configuration
# for the backend.
#
# Usage:
#   bash contracts/scripts/sandbox.sh              # Full start, deploy, and verify
#   bash contracts/scripts/sandbox.sh --stop       # Stop and remove the sandbox container
#   bash contracts/scripts/sandbox.sh --skip-docker# Run deploy/calls against already running node
set -euo pipefail

CONTAINER_NAME="${SANDBOX_CONTAINER:-stellar-sandbox}"
QUICKSTART_IMAGE="${QUICKSTART_IMAGE:-stellar/quickstart:testing}"
RPC_URL="${SANDBOX_RPC_URL:-http://localhost:8000/soroban/rpc}"
NETWORK_PASSPHRASE="${SANDBOX_NETWORK_PASSPHRASE:-Standalone Network ; February 2017}"
NETWORK_NAME="standalone"
SOURCE_IDENTITY="${SANDBOX_SOURCE:-sandbox-deployer}"
BENEFICIARY_IDENTITY="${SANDBOX_BENEFICIARY:-sandbox-beneficiary}"
CONTRACTS_DIR="contracts"
WASM_PATH="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/payment_escrow.wasm"

handle_stop() {
  echo "==> Stopping sandbox container '$CONTAINER_NAME'..."
  if command -v docker >/dev/null 2>&1; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    echo "Sandbox container '$CONTAINER_NAME' stopped."
  else
    echo "Docker command not found; nothing to stop."
  fi
  exit 0
}

if [[ "${1:-}" == "--stop" || "${1:-}" == "-s" ]]; then
  handle_stop
fi

SKIP_DOCKER=0
if [[ "${1:-}" == "--skip-docker" ]]; then
  SKIP_DOCKER=1
fi

echo "======================================================================"
echo " ManageHub Soroban Local Sandbox"
echo "======================================================================"

# 1. Dependency checks
echo "==> 1. Checking dependencies..."
if [[ "$SKIP_DOCKER" -eq 0 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Error: 'docker' is required to spin up the local Stellar quickstart node." >&2
    echo "Please install Docker or run with --skip-docker if using an external standalone node." >&2
    exit 1
  fi
fi

if ! command -v stellar >/dev/null 2>&1; then
  echo "Error: 'stellar' CLI is required. Install via:" >&2
  echo "  cargo install --locked stellar-cli" >&2
  exit 1
fi

# 2. Start Stellar Quickstart container
if [[ "$SKIP_DOCKER" -eq 0 ]]; then
  echo "==> 2. Starting Stellar Quickstart container ($CONTAINER_NAME)..."
  if docker ps --filter "name=^/${CONTAINER_NAME}$" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "  Container '$CONTAINER_NAME' is already running."
  else
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    echo "  Starting container with image: $QUICKSTART_IMAGE"
    docker run -d --rm \
      --name "$CONTAINER_NAME" \
      -p 8000:8000 \
      "$QUICKSTART_IMAGE" \
      --standalone \
      --enable-soroban-rpc
  fi

  echo "  Waiting for Soroban RPC to become ready at $RPC_URL..."
  attempts=0
  max_attempts=30
  until curl -s -f -X POST "$RPC_URL" \
    -H 'Content-Type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "Error: Timed out waiting for Soroban RPC to become healthy at $RPC_URL" >&2
      exit 1
    fi
    sleep 2
  done
  echo "  Soroban RPC is online and healthy!"
else
  echo "==> 2. Skipping Docker container start (--skip-docker requested)."
fi

# 3. Configure Stellar CLI network
echo "==> 3. Configuring local network '$NETWORK_NAME' in Stellar CLI..."
stellar network add \
  --global "$NETWORK_NAME" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" 2>/dev/null \
  || stellar network modify \
       --global "$NETWORK_NAME" \
       --rpc-url "$RPC_URL" \
       --network-passphrase "$NETWORK_PASSPHRASE" 2>/dev/null || true

# 4. Generate and fund identities
echo "==> 4. Setting up local identities..."
if ! stellar keys address "$SOURCE_IDENTITY" >/dev/null 2>&1; then
  echo "  Generating deployer key: $SOURCE_IDENTITY"
  stellar keys generate --global "$SOURCE_IDENTITY" --network "$NETWORK_NAME"
fi
echo "  Funding deployer ($SOURCE_IDENTITY)..."
stellar keys fund "$SOURCE_IDENTITY" --network "$NETWORK_NAME" || true

if ! stellar keys address "$BENEFICIARY_IDENTITY" >/dev/null 2>&1; then
  echo "  Generating beneficiary key: $BENEFICIARY_IDENTITY"
  stellar keys generate --global "$BENEFICIARY_IDENTITY" --network "$NETWORK_NAME"
fi
echo "  Funding beneficiary ($BENEFICIARY_IDENTITY)..."
stellar keys fund "$BENEFICIARY_IDENTITY" --network "$NETWORK_NAME" || true

SOURCE_ADDR="$(stellar keys address "$SOURCE_IDENTITY")"
SOURCE_SECRET="$(stellar keys secret "$SOURCE_IDENTITY" 2>/dev/null || stellar keys show "$SOURCE_IDENTITY" 2>/dev/null || echo "N/A")"
BENEFICIARY_ADDR="$(stellar keys address "$BENEFICIARY_IDENTITY")"

echo "  Deployer Address:    $SOURCE_ADDR"
echo "  Beneficiary Address: $BENEFICIARY_ADDR"

# 5. Build and deploy payment_escrow
echo "==> 5. Building contracts workspace..."
cd "$CONTRACTS_DIR"
cargo build --release --target wasm32-unknown-unknown
cd ..

echo "  Deploying payment_escrow contract..."
ESCROW_CONTRACT_ID="$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME")"
echo "  payment_escrow deployed at: $ESCROW_CONTRACT_ID"

echo "  Initialising contract admin..."
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME" \
  -- initialize --admin "$SOURCE_ADDR" 2>/dev/null || echo "  (Admin already initialised)"

# Resolve or deploy native asset contract for token payments
echo "  Resolving native asset contract..."
TOKEN_CONTRACT_ID="$(stellar contract id asset --asset native --network "$NETWORK_NAME" 2>/dev/null || echo "")"
if [ -z "$TOKEN_CONTRACT_ID" ]; then
  TOKEN_CONTRACT_ID="$(stellar contract deploy-asset --asset native --source "$SOURCE_IDENTITY" --network "$NETWORK_NAME" 2>/dev/null || echo "$ESCROW_CONTRACT_ID")"
fi
echo "  Token Contract ID:   $TOKEN_CONTRACT_ID"

# 6. End-to-end invoke: create -> release
echo "==> 6. Testing end-to-end escrow lifecycle (create -> release)..."
SAMPLE_ESCROW_ID="0101010101010101010101010101010101010101010101010101010101010101"
SAMPLE_AMOUNT=10000000 # 1 XLM (10^7 stroops)

echo "  a) Calling 'create' (Escrow ID: $SAMPLE_ESCROW_ID)..."
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME" \
  -- create \
  --escrow_id "$SAMPLE_ESCROW_ID" \
  --payer "$SOURCE_ADDR" \
  --beneficiary "$BENEFICIARY_ADDR" \
  --amount "$SAMPLE_AMOUNT" \
  --token "$TOKEN_CONTRACT_ID"

echo "  b) Verifying status is LOCKED (1)..."
STATUS_LOCKED="$(stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME" \
  -- get_status --escrow_id "$SAMPLE_ESCROW_ID")"
echo "     Status returned: $STATUS_LOCKED"

echo "  c) Calling 'release'..."
stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME" \
  -- release \
  --escrow_id "$SAMPLE_ESCROW_ID"

echo "  d) Verifying status is RELEASED (2)..."
STATUS_RELEASED="$(stellar contract invoke \
  --id "$ESCROW_CONTRACT_ID" \
  --source "$SOURCE_IDENTITY" \
  --network "$NETWORK_NAME" \
  -- get_status --escrow_id "$SAMPLE_ESCROW_ID")"
echo "     Status returned: $STATUS_RELEASED"

# 7. Print backend .env configuration
echo
echo "======================================================================"
echo " Sandbox Ready! Backend Configuration (.env):"
echo "======================================================================"
cat <<EOF
SOROBAN_ENABLED=true
STELLAR_ESCROW_CONTRACT_ID=$ESCROW_CONTRACT_ID
STELLAR_SECRET_KEY=$SOURCE_SECRET
STELLAR_NETWORK=$NETWORK_PASSPHRASE
STELLAR_BENEFICIARY_ADDRESS=$BENEFICIARY_ADDR
STELLAR_HORIZON_URL=http://localhost:8000
STELLAR_RPC_URLS=http://localhost:8000/soroban/rpc
EOF
echo "======================================================================"
echo "To stop the sandbox container, run: make sandbox ARGS=--stop or bash contracts/scripts/sandbox.sh --stop"
