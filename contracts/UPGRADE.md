# Contract Upgrade / Migration Path (CT-69)

## Chosen mechanism

Soroban's native contract-upgrade support (`env.deployer().update_current_contract_wasm(new_wasm_hash)`)
is the chosen upgrade mechanism, rather than a separate proxy contract:

- It keeps the contract's storage and Address (and therefore every
  existing `Escrow` record and every StrKey the backend already has
  configured as `STELLAR_ESCROW_CONTRACT_ID`) unchanged across an
  upgrade — a proxy pattern would either require redeploying storage at a
  new address or adding an extra indirection hop the backend integration
  doesn't need.
- It is the officially supported upgrade path for Soroban contracts and
  needs no additional infrastructure.

## Required scaffolding (not yet implemented)

The current `payment_escrow` scaffold has no admin/operator concept and
therefore **cannot yet perform an upgrade safely** — there is no
authorization gate on who may call `update_current_contract_wasm`. Before
this contract is deployed anywhere upgrades might be needed, it must gain:

1. An `admin: Address` stored at `initialize()` time (a new one-time entrypoint).
2. An `upgrade(new_wasm_hash: BytesN<32>)` entrypoint that:
   - calls `admin.require_auth()` (subject to the same CT-72 audit as every
     other state-changing entrypoint),
   - then calls `env.deployer().update_current_contract_wasm(new_wasm_hash)`.

This keeps the upgrade path itself in scope for the CT-72 authorization
audit and the CT-68 threat model — an unauthenticated upgrade entrypoint
would be a critical vulnerability.

## Verifying state survives an upgrade

Once the `admin`/`upgrade` scaffolding above lands, the upgrade path must
be proven safe with a test that:

1. Deploys the current contract version and creates one or more `Escrow`
   records via `create`.
2. Invokes `upgrade` with a build of the *next* contract version's WASM.
3. Re-reads the same `escrow_id`s via `get_status` (and/or a direct
   storage read) on the upgraded contract and asserts every record is
   byte-for-byte unchanged — in particular that `EscrowState`,
   `payer`, `beneficiary`, and `amount` all survive.
4. Exercises `release`/`refund` post-upgrade to confirm the upgraded code
   can still resolve escrows created under the old version.

This test is tracked as a follow-up (not included in this PR, which
scopes to documenting the mechanism per CT-69's acceptance criteria) and
must exist and pass before any contract in this workspace that uses the
upgrade entrypoint is deployed to mainnet — see the checklist in
[`SECURITY.md`](SECURITY.md).
