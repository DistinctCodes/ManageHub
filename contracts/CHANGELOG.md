# Contracts Changelog

All notable interface changes to the Soroban contracts are recorded here so
backend and indexer integrators can track compatibility across releases (#1877).

## Unreleased

### Added
- `payment_escrow::get_escrow(id)` read-only view function, so integrators no
  longer need a state-changing call to read escrow data (#1878).
- End-to-end create -> release walkthrough in `contracts/RUNBOOK.md` (#1879).

### Notes
- This file establishes the interface-change tracking process requested for the
  contracts workspace.
- Bump the contracts workspace toolchain to Rust 1.85.0, the minimum required
  by the locked `cpufeatures` 0.3.1 dependency, which uses the Rust 2024 edition.
