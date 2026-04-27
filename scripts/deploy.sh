#!/usr/bin/env bash
set -euo pipefail

# PulsarTrack - Stellar Deployment Script
# Deploys Soroban contracts with idempotency and flags

NETWORK="${STELLAR_NETWORK:-testnet}"
IDENTITY="${STELLAR_IDENTITY:-pulsartrack-deployer}"
OUTPUT_DIR="$(dirname "$0")/../deployments"
WASM_DIR="$(dirname "$0")/../target/wasm32-unknown-unknown/release"

FORCE=false
DRY_RUN=false

# Simple argument parsing
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --identity)
      IDENTITY="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

echo "=============================================="
echo "  PulsarTrack - Soroban Contract Deployment"
echo "  Network: $NETWORK"
echo "  Identity: $IDENTITY"
echo "  Force: $FORCE"
echo "  Dry Run: $DRY_RUN"
echo "=============================================="

# Ensure deployer identity exists (skip in dry run if possible)
if [ "$DRY_RUN" = false ]; then
  if ! stellar keys show "$IDENTITY" &>/dev/null; then
    echo "[Setup] Generating deployer keypair: $IDENTITY"
    stellar keys generate --network "$NETWORK" "$IDENTITY"
  fi
  DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
  echo "[Info] Deployer address: $DEPLOYER_ADDRESS"
  
  if [ "$NETWORK" = "testnet" ]; then
    echo "[Funding] Requesting testnet XLM from Friendbot..."
    FUND_RESULT=$(curl -s -w "%{http_code}" "https://friendbot.stellar.org?addr=$DEPLOYER_ADDRESS")
    if [ "${FUND_RESULT: -3}" != "200" ]; then
      echo "[Warning] Friendbot request may have failed"
    fi

    echo "[Waiting] Confirming account is funded..."
    for i in $(seq 1 30); do
      if stellar keys show "$IDENTITY" --network "$NETWORK" 2>/dev/null | grep -q "sequence"; then
        echo "[OK] Account funded"
        break
      fi
      [ "$i" -eq 30 ] && echo "[Error] Account not funded after 60s" && exit 1
      sleep 2
    done
  fi
else
  DEPLOYER_ADDRESS="DRY_RUN_ADDRESS"
  echo "[Info] Dry run mode - skipping identity check/funding"
fi

# Stabilized deployment file (avoid writing records during dry-run)
mkdir -p "$OUTPUT_DIR"
if [ "$DRY_RUN" = true ]; then
  DEPLOY_FILE="$(mktemp -t "pulsartrack-deployed-$NETWORK.XXXXXX.json")"
  echo '{"network": "'"$NETWORK"'", "deployer": "'"$DEPLOYER_ADDRESS"'", "contracts": {}}' > "$DEPLOY_FILE"
  echo "[Info] Dry run mode - not writing deployment record to $OUTPUT_DIR"
else
  DEPLOY_FILE="$OUTPUT_DIR/deployed-$NETWORK.json"
  if [ ! -f "$DEPLOY_FILE" ]; then
    echo '{"network": "'"$NETWORK"'", "deployer": "'"$DEPLOYER_ADDRESS"'", "contracts": {}}' > "$DEPLOY_FILE"
  fi

  # Ensure we never persist the dry-run placeholder as a deployer address
  python3 -c '
import json
import sys

deploy_file, deployer = sys.argv[1], sys.argv[2]
with open(deploy_file, encoding="utf-8") as f:
    data = json.load(f)

if data.get("deployer") == "DRY_RUN_ADDRESS":
    raise SystemExit("Deployment file has DRY_RUN_ADDRESS as deployer; aborting. Update the record or re-deploy without --dry-run.")

if not data.get("deployer"):
    data["deployer"] = deployer
    with open(deploy_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
' "$DEPLOY_FILE" "$DEPLOYER_ADDRESS"
fi

# Build all contracts (unless already built or dry run)
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "[Build] Building all Soroban contracts..."
  cargo build --release --target wasm32-unknown-unknown 2>&1 | tail -5
fi

# Deploy function
deploy_contract() {
  local NAME="$1"
  local WASM_NAME="$2"
  local WASM_PATH="$WASM_DIR/${WASM_NAME}.wasm"

  # Check if already deployed
  local EXISTING_ID
  EXISTING_ID=$(
    python3 - "$DEPLOY_FILE" "$NAME" <<'PY' 2>/dev/null || echo ""
import json
import sys

deploy_file, name = sys.argv[1], sys.argv[2]
with open(deploy_file, encoding="utf-8") as f:
    data = json.load(f)
print(data["contracts"].get(name, ""))
PY
  )

  if [ -n "$EXISTING_ID" ] && [ "$FORCE" = false ]; then
    echo "[Skip] $NAME already deployed: $EXISTING_ID"
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "[Dry Run] Would deploy $NAME ($WASM_PATH)"
    return 0
  fi

  if [ ! -f "$WASM_PATH" ]; then
    echo "[Error] $NAME - WASM not found: $WASM_PATH"
    return 1
  fi

  echo "[Deploy] $NAME..."
  local CONTRACT_ID
  CONTRACT_ID=$(stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    2>/dev/null) || {
    echo "[Error] Failed to deploy $NAME"
    return 1
  }

  echo "  -> $CONTRACT_ID"

  # Update deploy file
  python3 - "$NAME" "$CONTRACT_ID" "$DEPLOY_FILE" <<'PY'
import json
import sys

name, contract_id, deploy_file = sys.argv[1], sys.argv[2], sys.argv[3]
with open(deploy_file, encoding="utf-8") as f:
    data = json.load(f)
data["contracts"][name] = contract_id
with open(deploy_file, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY
}

# Core contracts
deploy_contract "ad_registry"           "pulsar_ad_registry"
deploy_contract "campaign_orchestrator" "pulsar_campaign_orchestrator"
deploy_contract "escrow_vault"          "pulsar_escrow_vault"
deploy_contract "fraud_prevention"      "pulsar_fraud_prevention"
deploy_contract "payment_processor"     "pulsar_payment_processor"

# Governance
deploy_contract "governance_token"      "pulsar_governance_token"
deploy_contract "governance_dao"        "pulsar_governance_dao"
deploy_contract "governance_core"       "pulsar_governance_core"
deploy_contract "timelock_executor"     "pulsar_timelock_executor"

# Publisher
deploy_contract "publisher_verification" "pulsar_publisher_verification"
deploy_contract "publisher_network"      "pulsar_publisher_network"
deploy_contract "publisher_reputation"   "pulsar_publisher_reputation"

# Analytics
deploy_contract "analytics_aggregator"  "pulsar_analytics_aggregator"
deploy_contract "campaign_analytics"    "pulsar_campaign_analytics"
deploy_contract "campaign_lifecycle"    "pulsar_campaign_lifecycle"

# Privacy & Targeting
deploy_contract "privacy_layer"         "pulsar_privacy_layer"
deploy_contract "targeting_engine"      "pulsar_targeting_engine"
deploy_contract "audience_segments"     "pulsar_audience_segments"
deploy_contract "identity_registry"     "pulsar_identity_registry"
deploy_contract "kyc_registry"          "pulsar_kyc_registry"

# Marketplace
deploy_contract "auction_engine"        "pulsar_auction_engine"
deploy_contract "creative_marketplace"  "pulsar_creative_marketplace"

# Financial
deploy_contract "subscription_manager"  "pulsar_subscription_manager"
deploy_contract "subscription_benefits" "pulsar_subscription_benefits"
deploy_contract "liquidity_pool"        "pulsar_liquidity_pool"
deploy_contract "milestone_tracker"     "pulsar_milestone_tracker"
deploy_contract "multisig_treasury"     "pulsar_multisig_treasury"
deploy_contract "oracle_integration"    "pulsar_oracle_integration"
deploy_contract "payout_automation"     "pulsar_payout_automation"
deploy_contract "performance_oracle"    "pulsar_performance_oracle"
deploy_contract "recurring_payment"     "pulsar_recurring_payment"
deploy_contract "refund_processor"      "pulsar_refund_processor"
deploy_contract "revenue_settlement"    "pulsar_revenue_settlement"
deploy_contract "rewards_distributor"   "pulsar_rewards_distributor"

# Bridge & Utility
deploy_contract "token_bridge"          "pulsar_token_bridge"
deploy_contract "wrapped_token"         "pulsar_wrapped_token"
deploy_contract "dispute_resolution"    "pulsar_dispute_resolution"
deploy_contract "budget_optimizer"      "pulsar_budget_optimizer"
deploy_contract "anomaly_detector"      "pulsar_anomaly_detector"

	echo ""
	echo "=============================================="
	echo "  Deployment complete!"
	if [ "$DRY_RUN" = true ]; then
	  echo "  Dry run complete (no deployment record written)"
	else
	  echo "  Results saved to: $DEPLOY_FILE"
	fi
	echo "=============================================="
