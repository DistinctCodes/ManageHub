# Upgrading the Contracts

[![Contracts CI](https://github.com/DistinctCodes/ManageHub/actions/workflows/contracts.yml/badge.svg)](https://github.com/DistinctCodes/ManageHub/actions/workflows/contracts.yml)

## Migrating existing Escrow storage (#1887)

An upgrade must not strand escrow entries that are already stored.

1. Before deploying the new WASM, export existing escrow keys and their
   serialized values (e.g. via a read-only `get_escrow` call per id).
2. Deploy the upgrade.
3. Run the migration step that rewrites legacy `Escrow` entries into the new
   layout, preserving `payer`, `beneficiary`, `amount` and status fields.
4. Verify a sample of migrated entries before unpausing new escrows.

> Storage layout changes should bump the contract version and add a changelog
> entry (see `contracts/CHANGELOG.md`).

## Resource cost: release vs refund (#1886)

`release` and `refund` should be cost-compared as part of release validation.
The introduction of the refund event (#1873) and the release/refund paths are
expected to be benchmarked together so a regression in either path is visible.
