#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

fail=0
while IFS= read -r -d '' srcdir; do
  lib="$srcdir/lib.rs"
  main="$srcdir/main.rs"
  if [ -f "$lib" ]; then
    root="$lib"
  elif [ -f "$main" ]; then
    root="$main"
  else
    continue
  fi
  while IFS= read -r -d '' file; do
    base="$(basename "$file")"
    if [ "$base" = "lib.rs" ] || [ "$base" = "main.rs" ]; then
      continue
    fi
    mod="${base%.rs}"
    if ! grep -Eq "^[[:space:]]*(pub[[:space:]]+)?mod[[:space:]]+${mod}[[:space:]]*;" "$root"; then
      echo "$file: not declared as a module in $root"
      fail=1
    fi
  done < <(find "$srcdir" -maxdepth 1 -type f -name '*.rs' -print0)
done < <(find . -path '*/src' -type d -not -path '*/target/*' -print0)

if [ "$fail" -ne 0 ]; then
  echo "Orphaned contract module files found."
  exit 1
fi

echo "No orphaned contract module files found."