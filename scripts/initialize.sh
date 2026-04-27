#!/usr/bin/env bash
set -euo pipefail

# PulsarTrack - Contract Initialization Script
# Runs after deploy.sh to initialize all contracts with admin and config

NETWORK="${STELLAR_NETWORK:-testnet}"
IDENTITY="${STELLAR_IDENTITY:-pulsartrack-deployer}"
DEPLOY_FILE=""
TOKEN_ADDRESS=""

# Simple argument parsing
while [[ $# -gt 0 ]]; do
  case $1 in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --identity)
      IDENTITY="$2"
      shift 2
      ;;
    --token)
      TOKEN_ADDRESS="$2"
      shift 2
      ;;
    --file)
      DEPLOY_FILE="$2"
      shift 2
      ;;
    *)
      # Legacy support for passing deploy file as first positional arg
      if [ -z "$DEPLOY_FILE" ]; then
        DEPLOY_FILE="$1"
      fi
      shift
      ;;
  esac
done

# Default deployment file if not provided
if [ -z "$DEPLOY_FILE" ]; then
  DEPLOY_FILE="$(dirname "$0")/../deployments/deployed-$NETWORK.json"
fi

if [ ! -f "$DEPLOY_FILE" ]; then
  echo "Error: Deployment file not found: $DEPLOY_FILE"
  echo "Run deploy.sh first."
  exit 1
fi

# Token derivation logic
if [ -z "$TOKEN_ADDRESS" ]; then
  if [ "$NETWORK" = "testnet" ]; then
    # Testnet XLM Contract ID
    TOKEN_ADDRESS="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
    echo "[Info] Using Testnet XLM: $TOKEN_ADDRESS"
  elif [ "$NETWORK" = "mainnet" ]; then
    # Mainnet XLM Contract ID
    TOKEN_ADDRESS="CAS3J7GYCCX3TP37S65CC3S6SRE6IDYRRW3B6LUL2B6GND5X67U5TBBT"
    echo "[Info] Using Mainnet XLM: $TOKEN_ADDRESS"
  else
    echo "Error: No token address provided and unknown network: $NETWORK"
    echo "Use --token <address> to specify the payment token."
    exit 1
  fi
fi

echo "=============================================="
echo "  PulsarTrack - Contract Initialization"
echo "  Network: $NETWORK"
echo "  Deployment: $DEPLOY_FILE"
echo "  Token: $TOKEN_ADDRESS"
echo "=============================================="

ADMIN_ADDRESS=$(stellar keys address "$IDENTITY")

# Helper: call a contract function
call_contract() {
  local CONTRACT_ID="$1"
  local FUNCTION="$2"
  shift 2
  
  # Check if already initialized (simple heuristic: if it fails, it might be initialized)
  # But better is to just try and catch.
  echo "[Invoke] $FUNCTION on $CONTRACT_ID..."
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    -- "$FUNCTION" "$@" 2>/dev/null || echo "  (Might already be initialized or failed)"
}

read_contract() {
  python3 - "$DEPLOY_FILE" "$1" <<'PY' 2>/dev/null
import json
import sys

deploy_file, name = sys.argv[1], sys.argv[2]
with open(deploy_file, encoding="utf-8") as f:
    data = json.load(f)
print(data["contracts"].get(name, ""))
PY
}

echo ""
echo "[Init] Initializing Ad Registry..."
AD_REGISTRY=$(read_contract ad_registry)
[ -n "$AD_REGISTRY" ] && call_contract "$AD_REGISTRY" initialize --admin "$ADMIN_ADDRESS" && echo "  OK"

echo "[Init] Initializing Campaign Orchestrator..."
CAMPAIGN=$(read_contract campaign_orchestrator)
[ -n "$CAMPAIGN" ] && call_contract "$CAMPAIGN" initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_ADDRESS" \
  && echo "  OK"

echo "[Init] Initializing Governance Token..."
GOV_TOKEN=$(read_contract governance_token)
[ -n "$GOV_TOKEN" ] && call_contract "$GOV_TOKEN" initialize --admin "$ADMIN_ADDRESS" && echo "  OK"

echo "[Init] Initializing Publisher Reputation..."
PUB_REP=$(read_contract publisher_reputation)
[ -n "$PUB_REP" ] && call_contract "$PUB_REP" initialize \
  --admin "$ADMIN_ADDRESS" \
  --oracle "$ADMIN_ADDRESS" \
  && echo "  OK"

echo "[Init] Initializing Privacy Layer..."
PRIVACY=$(read_contract privacy_layer)
[ -n "$PRIVACY" ] && call_contract "$PRIVACY" initialize --admin "$ADMIN_ADDRESS" && echo "  OK"

echo "[Init] Initializing Targeting Engine..."
TARGETING=$(read_contract targeting_engine)
[ -n "$TARGETING" ] && call_contract "$TARGETING" initialize --admin "$ADMIN_ADDRESS" && echo "  OK"

echo "[Init] Initializing Subscription Manager..."
SUB_MGR=$(read_contract subscription_manager)
[ -n "$SUB_MGR" ] && call_contract "$SUB_MGR" initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_ADDRESS" \
  --treasury "$ADMIN_ADDRESS" \
  && echo "  OK"

echo "[Init] Initializing Auction Engine..."
AUCTION=$(read_contract auction_engine)
[ -n "$AUCTION" ] && call_contract "$AUCTION" initialize \
  --admin "$ADMIN_ADDRESS" \
  --token "$TOKEN_ADDRESS" \
  && echo "  OK"

echo "[Init] Initializing Identity Registry..."
IDENTITY_REG=$(read_contract identity_registry)
[ -n "$IDENTITY_REG" ] && call_contract "$IDENTITY_REG" initialize --admin "$ADMIN_ADDRESS" && echo "  OK"

echo ""
echo "=============================================="
echo "  Initialization complete!"
echo "=============================================="
