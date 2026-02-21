//! Token upgrade mechanism for ManageHub.
//!
//! This module implements:
//! - `set_upgrade_config`     — admin configures upgrade behaviour
//! - `upgrade_token`          — upgrade a single token to a new version
//! - `batch_upgrade_tokens`   — upgrade multiple tokens in one call
//! - `get_token_version`      — query a token's current version number
//! - `get_upgrade_history`    — retrieve a token's full upgrade history
//! - `rollback_token_upgrade` — revert a token to a previous version

#![allow(deprecated)]

use crate::errors::Error;
use crate::membership_token::{DataKey, MembershipToken};
use crate::migration::MigrationModule;
use crate::types::{BatchUpgradeResult, MembershipStatus, UpgradeConfig};
use crate::upgrade_errors::UpgradeError;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

// ---------------------------------------------------------------------------
// TTL constants (in ledgers; ~1 ledger / 5 s on Stellar)
// ---------------------------------------------------------------------------

/// Keep upgrade history for ~90 days.
const UPGRADE_HISTORY_TTL_LEDGERS: u32 = 1_555_200;

/// Keep version snapshots for ~90 days.
const VERSION_SNAPSHOT_TTL_LEDGERS: u32 = 1_555_200;

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

pub struct UpgradeModule;

impl UpgradeModule {
    // -----------------------------------------------------------------------
    // Admin — configuration
    // -----------------------------------------------------------------------

    /// Initialise or update the global upgrade configuration. Admin only.
    pub fn set_upgrade_config(
        env: Env,
        admin: Address,
        config: UpgradeConfig,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        stored_admin.require_auth();
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        env.storage()
            .instance()
            .set(&DataKey::UpgradeConfig, &config);
        Ok(())
    }

    // -----------------------------------------------------------------------
    // Core upgrade operations
    // -----------------------------------------------------------------------

    /// Upgrade a single token to the next version.
    ///
    /// - Captures a snapshot of the current state for rollback purposes.
    /// - Increments the token's `current_version`.
    /// - Optionally updates `expiry_date`, `tier_id`, and `status`.
    /// - Emits a `TokenUpgraded` event.
    ///
    /// Authorization: admin always allowed; token owner allowed only if
    /// `upgrade_config.admin_only == false`.
    pub fn upgrade_token(
        env: Env,
        caller: Address,
        token_id: BytesN<32>,
        label: Option<String>,
        new_expiry_date: Option<u64>,
        new_tier_id: Option<String>,
        new_status: Option<MembershipStatus>,
    ) -> Result<u32, Error> {
        caller.require_auth();

        let config = Self::get_config(&env)?;
        if !config.upgrades_enabled {
            return Err(UpgradeError::UpgradesDisabled.into());
        }

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        // Authorisation check
        let is_admin = stored_admin == caller;
        if config.admin_only && !is_admin {
            return Err(UpgradeError::Unauthorized.into());
        }

        // Load token
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(UpgradeError::TokenNotFound)?;

        // If not admin, verify the caller owns the token
        if !is_admin && token.user != caller {
            return Err(UpgradeError::Unauthorized.into());
        }

        let from_version = token.current_version;
        let to_version = from_version.checked_add(1).ok_or(UpgradeError::Overflow)?;

        // Capture pre-upgrade snapshot (so we can rollback to this version)
        let snapshot = MigrationModule::capture_snapshot(&env, &token, label.clone());
        MigrationModule::store_snapshot(&env, &token_id, &snapshot);
        env.storage().persistent().extend_ttl(
            &DataKey::VersionSnapshot(token_id.clone(), from_version),
            VERSION_SNAPSHOT_TTL_LEDGERS,
            VERSION_SNAPSHOT_TTL_LEDGERS,
        );

        // Apply field migrations
        let new_tier_opt: Option<Option<String>> = new_tier_id.map(Some);
        let updated_token = MigrationModule::migrate_token_fields(
            &token,
            to_version,
            new_expiry_date,
            new_tier_opt,
            new_status,
        );

        // Persist updated token
        env.storage()
            .persistent()
            .set(&DataKey::Token(token_id.clone()), &updated_token);

        // Record upgrade history
        let record = MigrationModule::build_record(
            &env,
            token_id.clone(),
            from_version,
            to_version,
            caller.clone(),
            label,
            false,
        );
        MigrationModule::record_upgrade(&env, &record);
        env.storage().persistent().extend_ttl(
            &DataKey::UpgradeHistory(token_id.clone()),
            UPGRADE_HISTORY_TTL_LEDGERS,
            UPGRADE_HISTORY_TTL_LEDGERS,
        );

        // Emit TokenUpgraded event
        env.events().publish(
            (
                String::from_str(&env, "TokenUpgraded"),
                token_id.clone(),
                caller,
            ),
            (from_version, to_version),
        );

        Ok(to_version)
    }

    /// Upgrade multiple tokens in a single call.
    ///
    /// Processes each token ID independently; individual failures do NOT abort
    /// the entire batch — they are recorded as `success: false` in the result
    /// list. Admin only.
    pub fn batch_upgrade_tokens(
        env: Env,
        admin: Address,
        token_ids: Vec<BytesN<32>>,
        label: Option<String>,
        new_expiry_date: Option<u64>,
    ) -> Result<Vec<BatchUpgradeResult>, Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        let config = Self::get_config(&env)?;
        if !config.upgrades_enabled {
            return Err(UpgradeError::UpgradesDisabled.into());
        }

        let mut results: Vec<BatchUpgradeResult> = Vec::new(&env);

        for token_id in token_ids.iter() {
            let result = Self::upgrade_single_for_batch(
                &env,
                &admin,
                &token_id,
                label.clone(),
                new_expiry_date,
            );
            match result {
                Ok(new_version) => results.push_back(BatchUpgradeResult {
                    token_id: token_id.clone(),
                    success: true,
                    new_version: Some(new_version),
                }),
                Err(_) => results.push_back(BatchUpgradeResult {
                    token_id: token_id.clone(),
                    success: false,
                    new_version: None,
                }),
            }
        }

        Ok(results)
    }

    // -----------------------------------------------------------------------
    // Rollback
    // -----------------------------------------------------------------------

    /// Roll back a token to a specific previous version.
    ///
    /// - The token's version number continues to increment (not reset) so that
    ///   history is never lost.
    /// - Emits a `TokenUpgraded` event with `is_rollback = true` in the record.
    /// - Admin only.
    pub fn rollback_token_upgrade(
        env: Env,
        admin: Address,
        token_id: BytesN<32>,
        target_version: u32,
    ) -> Result<u32, Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        let config = Self::get_config(&env)?;

        // Check rollback limit
        if config.max_rollbacks > 0 {
            let rollback_count = MigrationModule::count_rollbacks(&env, &token_id);
            if rollback_count >= config.max_rollbacks {
                return Err(UpgradeError::RollbackLimitExceeded.into());
            }
        }

        // Load current token
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(UpgradeError::TokenNotFound)?;

        // Retrieve target snapshot
        let snapshot = MigrationModule::get_snapshot(&env, &token_id, target_version)
            .ok_or(UpgradeError::NoUpgradeHistory)?;

        let from_version = token.current_version;
        let to_version = from_version.checked_add(1).ok_or(UpgradeError::Overflow)?;

        // Build rollback label
        let rollback_label = Some(String::from_str(&env, "rollback"));

        // Capture snapshot of current state before overwriting
        let current_snapshot =
            MigrationModule::capture_snapshot(&env, &token, rollback_label.clone());
        MigrationModule::store_snapshot(&env, &token_id, &current_snapshot);

        // Apply snapshot fields but keep version incrementing
        let rolled_back_token = MigrationModule::apply_snapshot_to_token(
            &token,
            &snapshot,
            to_version,
            rollback_label.clone(),
        );

        // Persist
        env.storage()
            .persistent()
            .set(&DataKey::Token(token_id.clone()), &rolled_back_token);

        // Record rollback in history
        let record = MigrationModule::build_record(
            &env,
            token_id.clone(),
            from_version,
            to_version,
            admin.clone(),
            rollback_label,
            true,
        );
        MigrationModule::record_upgrade(&env, &record);
        env.storage().persistent().extend_ttl(
            &DataKey::UpgradeHistory(token_id.clone()),
            UPGRADE_HISTORY_TTL_LEDGERS,
            UPGRADE_HISTORY_TTL_LEDGERS,
        );

        // Emit event
        env.events().publish(
            (
                String::from_str(&env, "TokenUpgraded"),
                token_id.clone(),
                admin,
            ),
            (from_version, to_version),
        );

        Ok(to_version)
    }

    // -----------------------------------------------------------------------
    // Queries
    // -----------------------------------------------------------------------

    /// Return the current version number of a token.
    pub fn get_token_version(env: Env, token_id: BytesN<32>) -> Result<u32, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id))
            .ok_or(Error::TokenNotFound)?;
        Ok(token.current_version)
    }

    /// Return the full upgrade history for a token.
    pub fn get_upgrade_history(env: Env, token_id: BytesN<32>) -> Vec<crate::types::UpgradeRecord> {
        MigrationModule::get_upgrade_history(&env, &token_id)
    }

    /// Return the global upgrade configuration.
    pub fn get_upgrade_config(env: Env) -> Result<UpgradeConfig, Error> {
        Self::get_config(&env)
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    fn get_config(env: &Env) -> Result<UpgradeConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::UpgradeConfig)
            .ok_or(UpgradeError::UpgradeNotConfigured.into())
    }

    /// Inner upgrade logic reused by the batch operation.
    ///
    /// Does not call `require_auth` — the batch function's auth covers all
    /// tokens in the batch.
    fn upgrade_single_for_batch(
        env: &Env,
        admin: &Address,
        token_id: &BytesN<32>,
        label: Option<String>,
        new_expiry_date: Option<u64>,
    ) -> Result<u32, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(UpgradeError::TokenNotFound)?;

        let from_version = token.current_version;
        let to_version = from_version.checked_add(1).ok_or(UpgradeError::Overflow)?;

        // Snapshot pre-upgrade state
        let snapshot = MigrationModule::capture_snapshot(env, &token, label.clone());
        MigrationModule::store_snapshot(env, token_id, &snapshot);
        env.storage().persistent().extend_ttl(
            &DataKey::VersionSnapshot(token_id.clone(), from_version),
            VERSION_SNAPSHOT_TTL_LEDGERS,
            VERSION_SNAPSHOT_TTL_LEDGERS,
        );

        // Migrate fields (only expiry for batch; status/tier unchanged)
        let updated_token =
            MigrationModule::migrate_token_fields(&token, to_version, new_expiry_date, None, None);

        env.storage()
            .persistent()
            .set(&DataKey::Token(token_id.clone()), &updated_token);

        // Record
        let record = MigrationModule::build_record(
            env,
            token_id.clone(),
            from_version,
            to_version,
            admin.clone(),
            label,
            false,
        );
        MigrationModule::record_upgrade(env, &record);
        env.storage().persistent().extend_ttl(
            &DataKey::UpgradeHistory(token_id.clone()),
            UPGRADE_HISTORY_TTL_LEDGERS,
            UPGRADE_HISTORY_TTL_LEDGERS,
        );

        env.events().publish(
            (
                String::from_str(env, "TokenUpgraded"),
                token_id.clone(),
                admin.clone(),
            ),
            (from_version, to_version),
        );

        Ok(to_version)
    }
}
