# Contract Upgrade & Migration Guide

This document explains how Soroban contract upgrades work, how the ManageHub
contracts implement upgrades and data migration, and provides a step-by-step
guide for deploying, upgrading, migrating, and rolling back.

---

## How Soroban Contract Upgrades Work

Soroban contracts are immutable by default. Once deployed, their WASM bytecode
cannot be changed. However, the Stellar/Soroban runtime provides a built-in
upgrade mechanism:

1. **Deploy new WASM**: Upload the new contract code to the network.
2. **Upgrade existing contract**: Call the protocol-level `upgrade` function on
   the existing contract address, pointing it at the new WASM. This changes
   the code but **preserves all storage** (instance, persistent, and temporary).
3. **Run migration**: If the new code expects different storage layouts, call
   a migration function to transform existing data.

### Key Properties

- **Storage is preserved**: Instance, persistent, and temporary storage all
  survive an upgrade.
- **Code changes**: The new WASM replaces the old one atomically.
- **No automatic migration**: You must explicitly handle any schema changes.
- **Upgrade authorization**: Only the contract itself (via a subinvocation from
  an authorized admin) can upgrade itself.

---

## Current Upgrade Mechanism in ManageHub

### Token Upgrade System (`upgrade.rs`)

The ManageHub contract implements a **token-level** upgrade system for
membership tokens. This is distinct from the protocol-level contract upgrade.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token Upgrade Flow                           │
│                                                                 │
│  Admin calls upgrade_token(token_id, new_expiry, new_tier)      │
│    │                                                             │
│    ├─ 1. Capture snapshot (for rollback)                        │
│    ├─ 2. Increment version number                               │
│    ├─ 3. Apply field migrations                                 │
│    ├─ 4. Persist updated token                                  │
│    ├─ 5. Record upgrade history                                 │
│    └─ 6. Emit TokenUpgraded event                               │
│                                                                 │
│  Rollback: rollback_token_upgrade(token_id, target_version)     │
│    │                                                             │
│    ├─ 1. Load target version snapshot                           │
│    ├─ 2. Capture current state snapshot                         │
│    ├─ 3. Apply snapshot fields (version increments, not resets)  │
│    ├─ 4. Record rollback in history                             │
│    └─ 5. Emit TokenUpgraded event                               │
└─────────────────────────────────────────────────────────────────┘
```

### Configuration

The upgrade system is configured via `set_upgrade_config`:

| Field | Description |
|-------|-------------|
| `upgrades_enabled` | Master toggle for token upgrades |
| `admin_only` | If true, only admin can upgrade tokens |
| `max_rollbacks` | Maximum rollback count per token (0 = unlimited) |

### Migration Module (`migration.rs`)

The `MigrationModule` provides utilities for:

- **Snapshot capture**: Captures token state before upgrade for rollback
- **Field migration**: Applies selective field updates to tokens
- **Snapshot persistence**: Stores and retrieves version snapshots
- **History recording**: Maintains an audit trail of all upgrades

### Storage Keys Used

| Key | Storage Type | Description |
|-----|-------------|-------------|
| `UpgradeConfig` | Instance | Global upgrade configuration |
| `UpgradeHistory(token_id)` | Persistent | Vector of UpgradeRecord for a token |
| `VersionSnapshot(token_id, version)` | Persistent | Snapshot of token state at a version |

---

## Step-by-Step Upgrade Guide

### Step 1: Deploy New WASM

```bash
# Build the new contract
cd contracts
cargo build --release --target wasm32-unknown-unknown

# The WASM file will be at:
# target/wasm32-unknown-unknown/release/manage_hub.wasm
```

### Step 2: Upgrade an Existing Contract

To upgrade a Soroban contract (protocol-level):

```rust
use soroban_sdk::{Address, BytesN, Env};

// This would typically be done via the Stellar CLI:
// stellar contract invoke \
//   --id <CONTRACT_ID> \
//   -- \
//   __upgrade \
//   --new_wasm_hash <WASM_HASH>
```

Using the Stellar CLI:

```bash
# Upload new WASM and get the hash
stellar contract build contracts/
WASM_HASH=$(stellar contract upload --source-account <ADMIN_SECRET> \
  --network testnet \
  --wasm target/wasm32-unknown-unknown/release/manage_hub.wasm)

# Upgrade the existing contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account <ADMIN_SECRET> \
  --network testnet \
  -- \
  __upgrade \
  --new_wasm_hash $WASM_HASH
```

### Step 3: Handle Storage Migration

If the new contract version changes storage layouts:

1. **Identify changes**: Compare old and new `DataKey` enums and struct layouts.
2. **Write migration function**: Create a `migrate_storage` entrypoint that
   transforms old data to new format.
3. **Call migration**: After upgrade, invoke the migration function.

Example migration function:

```rust
pub fn migrate_storage(env: Env, admin: Address) -> Result<(), Error> {
    // Only admin can trigger migration
    let stored_admin: Address = env.storage().instance()
        .get(&DataKey::Admin)
        .ok_or(Error::AdminNotSet)?;
    if admin != stored_admin {
        return Err(Error::Unauthorized);
    }
    admin.require_auth();

    // Example: Migrate old subscription format
    // let old_subscriptions: Vec<OldSubscription> = ...
    // for old_sub in old_subscriptions.iter() {
    //     let new_sub = convert_to_new_format(old_sub);
    //     env.storage().persistent().set(&key, &new_sub);
    // }

    // Mark migration as complete
    env.storage().instance().set(&DataKey::MigrationVersion, &CURRENT_VERSION);

    Ok(())
}
```

### Step 4: Rollback Procedures

#### Token-Level Rollback

The contract supports rolling back individual tokens to previous versions:

```rust
// Roll back token to version 2
client.rollback_token_upgrade(&admin, &token_id, &2);
```

Key properties:
- Version number continues incrementing (never resets)
- State fields (expiry, tier, status) are restored from snapshot
- Rollback count is tracked and limited by `max_rollbacks`
- Full audit trail is preserved in upgrade history

#### Contract-Level Rollback

For protocol-level contract rollback:

1. Keep the old WASM hash available
2. Re-run the upgrade with the old WASM:
   ```bash
   stellar contract invoke \
     --id <CONTRACT_ID> \
     --source-account <ADMIN_SECRET> \
     --network testnet \
     -- \
     __upgrade \
     --new_wasm_hash <OLD_WASM_HASH>
   ```
3. If storage was migrated, write a reverse migration function

**Warning**: Contract-level rollback is risky if storage was mutated by the
new code. Always test rollback scenarios in a staging environment.

---

## Testing Upgrades

### Token Upgrade Test

```rust
#[test]
fn test_upgrade_preserves_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup
    client.set_admin(&admin);

    // Issue token
    let expiry = env.ledger().timestamp() + 30 * 86400;
    client.issue_token(&token_id, &user, &expiry);

    let original = client.get_token(&token_id);
    assert_eq!(original.current_version, 0);

    // Upgrade
    let new_version = client.upgrade_token(
        &admin, &token_id,
        &Some(String::from_str(&env, "v1")),
        &None, &None, &None,
    );
    assert_eq!(new_version, 1);

    // Verify state preserved
    let upgraded = client.get_token(&token_id);
    assert_eq!(upgraded.user, user);
    assert_eq!(upgraded.expiry_date, expiry);
    assert_eq!(upgraded.current_version, 1);
}
```

### Rollback Test

```rust
#[test]
fn test_rollback_restores_previous_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup and issue
    client.set_admin(&admin);
    let expiry_v0 = env.ledger().timestamp() + 30 * 86400;
    client.issue_token(&token_id, &user, &expiry_v0);

    // Upgrade to v1 with new expiry
    let expiry_v1 = env.ledger().timestamp() + 60 * 86400;
    client.upgrade_token(&admin, &token_id, &None, &Some(expiry_v1), &None, &None);

    let v1 = client.get_token(&token_id);
    assert_eq!(v1.expiry_date, expiry_v1);
    assert_eq!(v1.current_version, 1);

    // Rollback to v0
    let rollback_version = client.rollback_token_upgrade(&admin, &token_id, &0);
    assert_eq!(rollback_version, 2); // version increments, not resets

    let rolled_back = client.get_token(&token_id);
    assert_eq!(rolled_back.expiry_date, expiry_v0); // v0 state restored
    assert_eq!(rolled_back.current_version, 2);     // but version incremented
}
```

---

## Best Practices

1. **Always test upgrades in staging** before deploying to mainnet.
2. **Keep old WASM hashes** stored securely for potential rollback.
3. **Write reverse migrations** for every forward migration.
4. **Use the token upgrade system** for token-level changes (preserves audit trail).
5. **Use protocol-level upgrades** only for contract logic changes.
6. **Never change storage key layouts** without a migration function.
7. **Version your storage** by adding a `StorageVersion` key to instance storage.
8. **Monitor upgrade events** — the contract emits `TokenUpgraded` for every change.
