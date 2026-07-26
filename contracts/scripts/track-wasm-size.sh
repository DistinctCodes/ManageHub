#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# track-wasm-size.sh — Build all contracts to WASM and report file sizes.
#
# Usage:
#   ./contracts/scripts/track-wasm-size.sh            # report sizes
#   ./contracts/scripts/track-wasm-size.sh --check     # fail if > 500 KB
# ──────────────────────────────────────────────────────────────────────────────

CONTRACTS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WASM_DIR="${CONTRACTS_DIR}/target/wasm32v1-none/release"
MAX_SIZE_KB="${MAX_SIZE_KB:-500}"
CHECK_MODE=false

if [[ "${1:-}" == "--check" ]]; then
    CHECK_MODE=true
fi

echo "Building all contracts to WASM (release)..."
cd "$CONTRACTS_DIR"

# Build all workspace members targeting wasm32v1-none
cargo build --release --target wasm32v1-none 2>&1

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  WASM Size Report"
echo "════════════════════════════════════════════════════════════════"
printf "%-40s %10s %10s\n" "CONTRACT" "SIZE (KB)" "STATUS"
echo "────────────────────────────────────────────────────────────────"

FAILED=false
for wasm_file in "$WASM_DIR"/*.wasm; do
    [ -f "$wasm_file" ] || continue
    filename="$(basename "$wasm_file")"
    size_bytes=$(stat -f%z "$wasm_file" 2>/dev/null || stat -c%s "$wasm_file" 2>/dev/null)
    size_kb=$((size_bytes / 1024))
    status="OK"

    if [ "$size_bytes" -gt $((MAX_SIZE_KB * 1024)) ]; then
        status="OVER BUDGET"
        FAILED=true
    fi

    printf "%-40s %8s KB %10s\n" "$filename" "$size_kb" "$status"
done

echo "════════════════════════════════════════════════════════════════"
echo "  Budget: ${MAX_SIZE_KB} KB per contract WASM"
echo "════════════════════════════════════════════════════════════════"

if $CHECK_MODE && $FAILED; then
    echo ""
    echo "ERROR: One or more contracts exceed the ${MAX_SIZE_KB} KB WASM budget."
    exit 1
fi

echo "All contracts within budget."
