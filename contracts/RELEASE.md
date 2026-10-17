# Contract Release & Upgrade Process

## Upgrade failure mid-deploy (#1895)

If an upgrade fails partway through, funds must never be stranded.

1. **Pre-flight**: the new WASM is uploaded and its hash verified *before* any
   `upgrade` call is made, so a bad build never reaches the live instance.
2. **Atomic switch**: only after upload succeeds is `update_current_contract_wasm`
   invoked; Soroban applies the swap atomically, so a failed call leaves the old
   WASM active.
3. **Locked funds**: an escrow that is locked under the old WASM remains readable
   and releasable under the new WASM because storage layout is preserved across
   upgrades (see `contracts/UPGRADE.md`).
4. **Rollback**: if the new WASM misbehaves, re-run the upgrade with the previous
   WASM hash.

## Dependency version pinning (#1896)

`contracts/payment_escrow/Cargo.toml` should pin `soroban-sdk` to an exact patch
version (for example `=21.7.4`) rather than a caret range, so a patch release
cannot silently change contract behaviour between builds.
