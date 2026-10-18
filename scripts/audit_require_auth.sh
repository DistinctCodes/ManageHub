#!/usr/bin/env bash
#
# CT-72 / CT-76 — authorization audit.
#
# Check 1 (CT-72): fails if any `pub fn` in a contracts/*/src/*.rs file writes
# to contract storage (persistent/instance/temporary .set/.remove/.extend_ttl)
# without also calling require_auth() somewhere in its body.
#
# Check 2: fails if a state-changing `pub fn` authenticates only an address
# that was passed in as a parameter (`<param>: Address` ... `<param>.require_auth()`)
# without also consulting storage (`.get(` or `.has(`). Authenticating a
# caller-supplied address proves the caller owns *that* address, not that it
# is the address that should be authorised; loading the stored admin (or
# checking the record does not exist yet) is what binds authority to state.
#
# A function that intentionally skips a check (e.g. a permissionless public
# entrypoint) can opt out with a `// AUTH-EXEMPT: <reason>` comment on the
# line directly above its `pub fn`.
#
# What this does NOT prove: that the stored address is the *right* one, or
# that every code path reaches the check. Review those by hand.
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
      has_read = 0
      sig = ""
      in_sig = 1
      param_auth = 0
      auth_idents = ""
    }
    in_fn {
      if (in_sig) {
        sig = sig " " $0
        if ($0 ~ /\{/) in_sig = 0
      }
      if ($0 ~ /\.(persistent|instance|temporary)\(\)\.(set|remove|extend_ttl)\(/) has_write = 1
      if ($0 ~ /\.(persistent|instance|temporary)\(\)\.(get|has)(::<[^>]*>)?\(/) has_read = 1
      if ($0 ~ /require_auth\(/) {
        has_auth = 1
        line = $0
        if (match(line, /[a-z_][a-z_0-9]*\.require_auth\(/)) {
          ident = substr(line, RSTART, RLENGTH)
          sub(/\.require_auth\($/, "", ident)
          auth_idents = auth_idents " " ident
        }
      }

      n_open = gsub(/\{/, "{")
      depth += n_open
      n_close = gsub(/\}/, "}")
      depth -= n_close
      if (depth > 0) started = 1

      if (started && depth <= 0) {
        in_fn = 0
        if (has_write && !has_auth && !exempt) {
          print file ": " fn_line " (no require_auth)"
          bad = 1
        }
        if (has_write && has_auth && !has_read && !exempt) {
          n = split(auth_idents, ids, " ")
          for (i = 1; i <= n; i++) {
            if (ids[i] != "" && sig ~ ("(^|[^a-z_0-9])" ids[i] ": Address")) {
              print file ": " fn_line " (authenticates parameter `" ids[i] "` without consulting stored state)"
              bad = 1
              break
            }
          }
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
  echo "::error::One or more state-changing entrypoints failed the authorization audit (see above)."
  echo "Add the missing check, load the authorised address from storage, or mark a deliberately"
  echo "permissionless entrypoint with a '// AUTH-EXEMPT: <reason>' comment on the line above its pub fn."
  exit 1
fi

echo "✓ All state-changing contract entrypoints have require_auth() coverage bound to stored state."
