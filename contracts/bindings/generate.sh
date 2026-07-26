#!/usr/bin/env bash
set -euo pipefail

# Generate TypeScript bindings for all ManageHub Soroban contracts.
# Usage: ./generate.sh [--output-dir <path>]
#
# Prerequisites:
#   - soroban-cli installed (or `stellar` CLI)
#   - Contract WASM files built via `soroban contract build` or `cargo build --target wasm32-unknown-unknown --release`

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_ROOT="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${SCRIPT_DIR}/generated"

while [[ $# -gt 0 ]]; do
  case $1 in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Ensure the output directory exists
mkdir -p "$OUTPUT_DIR"

CONTRACTS=(
  "manage_hub"
  "access_control"
  "membership_token"
  "workspace_booking"
  "payment_escrow"
  "resource_credits"
)

# Resolve the CLI binary (prefer `stellar` if available, fall back to `soroban`)
CLI=""
if command -v stellar &>/dev/null; then
  CLI="stellar"
elif command -v soroban &>/dev/null; then
  CLI="soroban"
else
  echo "Error: neither 'stellar' nor 'soroban' CLI found in PATH." >&2
  exit 1
fi

echo "Using CLI: $CLI"
echo "Output directory: $OUTPUT_DIR"
echo ""

for contract in "${CONTRACTS[@]}"; do
  WASM_PATH="${CONTRACTS_ROOT}/target/wasm32-unknown-unknown/release/${contract}.wasm"

  if [[ ! -f "$WASM_PATH" ]]; then
    echo "Warning: WASM not found for '$contract' at $WASM_PATH — skipping."
    echo "  Build first with: cargo build --target wasm32-unknown-unknown --release"
    continue
  fi

  echo "Generating TypeScript bindings for: $contract"
  $CLI contract bindings typescript \
    --wasm "$WASM_PATH" \
    --output-dir "$OUTPUT_DIR" \
    --name "$contract"
  echo "  -> $OUTPUT_DIR/${contract}.ts"
done

echo ""
echo "Done. Generated files:"
ls -1 "$OUTPUT_DIR"/*.ts 2>/dev/null || echo "  (none)"
