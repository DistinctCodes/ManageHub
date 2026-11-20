# Contracts Changelog

All notable interface changes to the Soroban contracts are recorded here so
backend and indexer integrators can track compatibility across releases (#1877).

## Unreleased

### Changed
- Route the legacy `payment_escrow::refund` entrypoint through the same
  validation and transfer path as `refund_remaining`; new integrations should
  use `refund_remaining`, which returns the amount refunded (#2169).
- Check both contract error enums against the shared TypeScript error codes
  and map each escrow error code to an explicit backend disposition (#2166,
  #2167).

### Toolchain
- Bump the contracts toolchain to Rust 1.98.1 and check in the resolved Cargo
  lockfile so CI can build the workspace with current transitive dependencies.

### Added
- `payment_escrow::get_escrow(id)` read-only view function, so integrators no
  longer need a state-changing call to read escrow data (#1878).
- End-to-end create -> release walkthrough in `contracts/RUNBOOK.md` (#1879).

### Notes
- This file establishes the interface-change tracking process requested for the
  contracts workspace.
