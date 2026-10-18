# Contract Compatibility Matrix

This file tracks compatibility between contract versions (WASM hashes) and backend versions.

Each entry corresponds to a contract release (usually a tag or commit) and notes:

- **Contract Version / Tag** (e.g., `v1.2.0`)
- **WASM Hash** (the deployed contract’s WASM bytes hash)
- **Interface Changes** (added/removed/changed entrypoints or types)
- **Backend Compatibility Range** (minimum and maximum backend versions that work with this contract)
- **Migration Steps** (any special steps needed when upgrading from previous contract version)

## Entries

| Contract Tag       | WASM Hash       | Interface Changes                                                                                    | Backend Compatibility | Migration Steps                                                                                             |
| ------------------ | --------------- | ---------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `v1.0.0` (initial) | `<placeholder>` | Initial `payment_escrow` with `create`, `release`, `refund`, `get_status`                            | backend `>= v0.1.0`   | N/A                                                                                                         |
| `v1.1.0`           | `<placeholder>` | Added `partial_release(escrow_id, amount)`; updated error codes for insufficient funds               | backend `>= v0.2.0`   | Update backend client to call new function; ensure amount uses checked arithmetic                           |
| `v1.2.0`           | `<placeholder>` | Added `set_beneficiary(escrow_id, new_beneficiary)`; changed `release` to require operator signature | backend `>= v0.3.0`   | Backend must now fetch operator signature before calling `release`; add new endpoint for beneficiary change |

_Replace `<placeholder>` with the actual WASM hash (e.g., `0xabcdef…`) when the contract is built and deployed._

## How to Update

When preparing a PR that modifies any contract under `contracts/`:

1. Build the contract (`make build`) to obtain the new WASM.
2. Compute its hash (e.g., `sha256sum target/wasm32-unknown-unknown/release/<name>.wasm`).
3. Add a new row to the table above with:
   - A new contract tag (follow semantic versioning; increment based on changes).
   - The WASM hash.
   - A brief description of interface changes (entrypoints, types, error codes).
   - The backend version range that has been tested/compatible.
   - Any migration steps required for existing escrows or backend configuration.
4. If the change is backwards‑compatible, note that no migration is needed.
5. Update the PR description to reference this file.
