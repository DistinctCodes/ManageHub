#!/usr/bin/env bash
set -euo pipefail

# PulsarTrack - Full Network Setup Wrapper
# Runs both deploy.sh and initialize.sh

NETWORK="${STELLAR_NETWORK:-testnet}"
IDENTITY="${STELLAR_IDENTITY:-pulsartrack-deployer}"
FORCE=false
TOKEN=""

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
    --force)
      FORCE=true
      shift
      ;;
    --token)
      TOKEN="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

SCRIPT_DIR="$(dirname "$0")"

echo ">>> Starting PulsarTrack Setup on $NETWORK <<<"

# 1. Deploy
DEPLOY_CMD=("$SCRIPT_DIR/deploy.sh" --network "$NETWORK" --identity "$IDENTITY")
if [ "$FORCE" = true ]; then
  DEPLOY_CMD+=(--force)
fi

"${DEPLOY_CMD[@]}"

# 2. Initialize
INIT_CMD=("$SCRIPT_DIR/initialize.sh" --network "$NETWORK" --identity "$IDENTITY")
if [ -n "$TOKEN" ]; then
  INIT_CMD+=(--token "$TOKEN")
fi

"${INIT_CMD[@]}"

echo ">>> Setup Complete for $NETWORK <<<"
