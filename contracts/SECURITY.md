# Contracts Workspace — Threat Model & Pre-Deployment Checklist (CT-68)

This document covers the Soroban contracts under `contracts/`. It must be
reviewed and kept current before any contract in this workspace is deployed
to Stellar mainnet.

## Trust model

The backend integration (see [`README.md`](README.md)) holds a single
treasury/operator secret key, `STELLAR_SECRET_KEY` (bound via
`soroban-config.ts`), used to submit `release` and `refund` transactions.

- **Who is trusted:** whoever holds `STELLAR_SECRET_KEY`. That key is a
  single point of trust for triggering escrow resolution transactions from
  the backend's side.
- **What each role can do today:**
  - **Payer** — creates an escrow (`create`, requires the payer's own
    `require_auth()`) and authorizes releasing its funds to the beneficiary
    (`release`, requires the payer's `require_auth()`).
  - **Beneficiary** — authorizes giving up their claim and refunding the
    payer (`refund`, requires the beneficiary's `require_auth()`).
  - **Backend/treasury key** — submits the transaction envelope for
    `release`/`refund` calls, but does **not** currently hold any special
    on-chain authorization of its own; the contract has no admin/operator
    Address concept yet. The backend must collect a valid `require_auth()`
    signature from the payer or beneficiary out-of-band before it can
    successfully submit these calls.
- **Blast radius of a compromised `STELLAR_SECRET_KEY`:** since the
  contract does not (yet) grant this key any special authority, a
  compromise of this key alone cannot move escrowed funds — the attacker
  would still need a valid payer/beneficiary authorization. However, it
  could be used to censor (withhold submission of) legitimate
  release/refund transactions, or to submit malformed transactions that
  the contract itself is responsible for rejecting.
- **Open question:** whether a future version should introduce an
  admin/arbiter role (e.g. for disputed refunds) is intentionally left
  undecided here — see [CT-69's upgrade doc](UPGRADE.md) for how such a
  change would be rolled out safely.

## Assets at risk per contract

| Contract         | Asset at risk                          | Attack surface                                                                 |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `payment_escrow`  | Escrowed `amount` per `Escrow` record  | `create`, `release`, `refund` — every state-changing entrypoint (see CT-72)     |

### Entrypoint-by-entrypoint attack surface (`payment_escrow`)

- **`create`** — requires `payer.require_auth()`. Rejects non-positive
  amounts and duplicate `escrow_id`s. Risk: a colliding/predictable
  `escrow_id` could let an attacker front-run `create` for an ID the
  backend intended to use next — mitigated by the backend deriving IDs as
  a SHA-256 hash of an internal UUID (see `README.md`), which is
  infeasible to predict or collide.
- **`release`** — requires `escrow.payer.require_auth()`. Rejects if the
  escrow is not `Locked`. Risk: none beyond payer key compromise.
- **`refund`** — requires `escrow.beneficiary.require_auth()`. Rejects if
  the escrow is not `Locked`. Risk: none beyond beneficiary key
  compromise.
- **`get_status`** — read-only, no authorization required by design
  (informational only, cannot mutate state).

## Pre-deployment checklist

Before deploying any contract in this workspace to mainnet:

- [ ] **Authorization audit (CT-72)** — `make audit` (or
      `bash scripts/audit_require_auth.sh`) passes with no findings, and
      CI's `contracts-auth-audit` job is green on the deploy commit.
- [ ] **Arithmetic overflow audit (CT-73)** — every amount-handling path
      uses `checked_add`/`checked_sub` (see `payment_escrow/src/lib.rs`'s
      `checked_amount_add`/`checked_amount_sub` helpers); no raw `+`/`-`
      on amounts anywhere in the workspace.
- [ ] This trust model has been reviewed by at least one other
      contributor and any open questions above have been resolved or
      explicitly accepted as known risk.
- [ ] The upgrade path (see [`UPGRADE.md`](UPGRADE.md)) is in place if
      the deployment is expected to require future fixes.

This checklist is also linked from the PR template
(`.github/PULL_REQUEST_TEMPLATE.md`) so contract changes are reviewed
against it before merge.
