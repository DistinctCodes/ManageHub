#!/usr/bin/env bash
#
# CT-72 — authorization audit.
#
# Fails if any `pub fn` in a contracts/*/src/*.rs file writes to contract
# storage (persistent/instance/temporary .set/.remove/.extend_ttl) without
# also calling require_auth() somewhere in its body.
#
# A function that intentionally skips the check (e.g. a permissionless
# public entrypoint) can opt out with a `// AUTH-EXEMPT: <reason>` comment
# on the line directly above its `pub fn`.
#
# Usage: scripts/audit_require_auth.sh
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0

while IFS= read -r -d '' file; do
  if ! awk -v file="$file" '
    /\/\/[ \t]*AUTH-EXEMPT:/ { exempt = 1; next }
    /^[ \t]*pub fn / {
      fn_line = $0
      in_fn = 1
      depth = 0
      started = 0
      has_write = 0
      has_auth = 0
    }
    in_fn {
      if ($0 ~ /\.(persistent|instance|temporary)\(\)\.(set|remove|extend_ttl)\(/) has_write = 1
      if ($0 ~ /require_auth\(/) has_auth = 1

      n_open = gsub(/\{/, "{")
      depth += n_open
      n_close = gsub(/\}/, "}")
      depth -= n_close
      if (depth > 0) started = 1

      if (started && depth <= 0) {
        in_fn = 0
        if (has_write && !has_auth && !exempt) {
          print file ": " fn_line
          bad = 1
        }
        exempt = 0
      }
    }
    END { exit bad ? 1 : 0 }
  ' "$file"; then
    fail=1
  fi
done < <(find contracts -name "*.rs" -not -path "*/target/*" -print0)

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "::error::One or more state-changing entrypoints are missing a require_auth() call (see above)."
  echo "Add the missing check, or mark a deliberately permissionless entrypoint with a"
  echo "'// AUTH-EXEMPT: <reason>' comment on the line above its pub fn."
  exit 1
fi

echo "✓ All state-changing contract entrypoints have require_auth() coverage."
