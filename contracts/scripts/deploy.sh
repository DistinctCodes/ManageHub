#!/usr/bin/env bash
# Deploy the ManageHub contracts with the Stellar CLI and record the contract IDs.
#
# Usage: NETWORK=testnet SOURCE=<identity> bash contracts/scripts/deploy.sh
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:?Set SOURCE to a Stellar CLI identity (see 'stellar keys')}"
CRATES="${CRATES:-payment_escrow revenue_distribution}"
OUT_DIR="contracts/deployments"
OUT_FILE="$OUT_DIR/$NETWORK.json"
WASM_DIR="contracts/target/wasm32-unknown-unknown/release"

mkdir -p "$OUT_DIR"
printf '{\n' > "$OUT_FILE"
first=1

for crate in $CRATES; do
  wasm="$WASM_DIR/$crate.wasm"
  [ -f "$wasm" ] || { echo "missing $wasm - run 'make build' first" >&2; exit 1; }

  stellar contract optimize --wasm "$wasm" >/dev/null
  optimized="$WASM_DIR/$crate.optimized.wasm"
  [ -f "$optimized" ] || optimized="$wasm"

  echo "Deploying $crate to $NETWORK..."
  admin="$(stellar keys address "$SOURCE")"
  id="$(stellar contract deploy --wasm "$optimized" --source "$SOURCE" --network "$NETWORK" -- --admin "$admin")"

  # The constructor already stored this admin; initialize is a compatibility
  # no-op for older tooling. A failure here is fatal, not a message to ignore.
  if ! stellar contract invoke --id "$id" --source "$SOURCE" --network "$NETWORK" -- initialize --admin "$admin" >/dev/null; then
    echo "  initialize failed for $crate" >&2
    exit 1
  fi

  stored="$(stellar contract invoke --id "$id" --source "$SOURCE" --network "$NETWORK" -- get_admin)"
  stored="$(printf '%s' "$stored" | tr -d '"[:space:]')"
  if [ "$stored" != "$admin" ]; then
    echo "  admin mismatch for $crate: expected $admin, got $stored" >&2
    exit 1
  fi

  [ "$first" -eq 1 ] || printf ',\n' >> "$OUT_FILE"
  printf '  "%s": "%s"' "$crate" "$id" >> "$OUT_FILE"
  first=0
  echo "  $crate -> $id"
done

printf '\n}\n' >> "$OUT_FILE"
echo
echo "Recorded contract IDs in $OUT_FILE. Backend environment:"
echo "STELLAR_ESCROW_CONTRACT_ID=$(grep payment_escrow "$OUT_FILE" | sed 's/.*: "\(.*\)".*/\1/')"
