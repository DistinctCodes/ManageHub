## Summary

<!-- What does this PR do, and why? -->

## Contracts checklist

If this PR touches anything under `contracts/`, confirm it against the
[pre-deployment security checklist](../contracts/SECURITY.md) before
requesting review:

- [ ] `make audit` (CT-72 require_auth() coverage) passes.
- [ ] Every amount-handling path uses checked arithmetic (CT-73) — no raw
      `+`/`-` on amounts.
- [ ] Not applicable — this PR does not touch `contracts/`.

## Test plan

<!-- How did you verify this change? -->
