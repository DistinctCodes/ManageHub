#!/usr/bin/env bash
set -euo pipefail

# PulsarTrack - Setup Stellar CLI identity for deployment

IDENTITY="${STELLAR_IDENTITY:-pulsartrack-deployer}"
NETWORK="${STELLAR_NETWORK:-testnet}"

echo "=============================================="
echo "  PulsarTrack - Identity Setup"
echo "=============================================="

# Check stellar CLI is available
if ! command -v stellar &>/dev/null; then
  echo "Error: 'stellar' CLI not found."
  echo "Install via: cargo install --locked stellar-cli --features opt"
  exit 1
fi

echo "[Network] Configuring Stellar CLI for $NETWORK..."
stellar network use "$NETWORK" 2>/dev/null || true

# Generate deployer keypair if not exists
if stellar keys show "$IDENTITY" &>/dev/null 2>&1; then
  echo "[Keys] Identity '$IDENTITY' already exists."
else
  echo "[Keys] Generating new identity: $IDENTITY"
  stellar keys generate --network "$NETWORK" "$IDENTITY"
fi

DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
echo "[Keys] Deployer address: $DEPLOYER_ADDRESS"

if [ "$NETWORK" = "testnet" ]; then
  echo ""
  echo "[Funding] Requesting XLM from testnet Friendbot..."
  RESPONSE=$(curl -s "https://friendbot.stellar.org?addr=$DEPLOYER_ADDRESS")
  if echo "$RESPONSE" | grep -q '"id"'; then
    echo "[Funding] Account funded successfully!"
  else
    echo "[Warning] Could not fund account - it may already be funded"
  fi
  echo ""
  echo "[Balance] Checking account balance..."
  sleep 3
  curl -s "https://horizon-testnet.stellar.org/accounts/$DEPLOYER_ADDRESS" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'  {b[\"asset_type\"]}: {b[\"balance\"]}') for b in d.get('balances',[])]" 2>/dev/null || true
fi

echo ""
echo "[Done] Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Build contracts:  cargo build --release --target wasm32-unknown-unknown"
echo "  2. Deploy:           ./scripts/deploy.sh"
echo "  3. Initialize:       ./scripts/initialize.sh"
