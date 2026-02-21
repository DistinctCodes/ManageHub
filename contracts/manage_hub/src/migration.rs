//! Migration helpers for token upgrade data transformation.
//!
//! This module provides utilities to migrate token state when upgrading between
//! versions. Migrations preserve token identity (id, user, issue_date) while
//! allowing modifications to mutable fields (expiry_date, tier_id, status).

use crate::membership_token::{DataKey, MembershipToken};
use crate::types::{MembershipStatus, TokenVersionSnapshot, UpgradeRecord};
use soroban_sdk::{Address, BytesN, Env, String, Vec};

pub struct MigrationModule;

impl MigrationModule {
    /// Capture a snapshot of the token's current state for rollback purposes.
    ///
    /// Must be called **before** mutating the token so the snapshot reflects
    /// the pre-upgrade state.
    pub fn capture_snapshot(
        env: &Env,
        token: &MembershipToken,
        label: Option<String>,
    ) -> TokenVersionSnapshot {
        TokenVersionSnapshot {
            version: token.current_version,
            expiry_date: token.expiry_date,
            status: token.status.clone(),
            tier_id: token.tier_id.clone(),
            captured_at: env.ledger().timestamp(),
            label,
        }
    }

    /// Persist a version snapshot to storage.
    pub fn store_snapshot(env: &Env, token_id: &BytesN<32>, snapshot: &TokenVersionSnapshot) {
        env.storage().persistent().set(
            &DataKey::VersionSnapshot(token_id.clone(), snapshot.version),
            snapshot,
        );
    }

    /// Retrieve a version snapshot from storage, if it exists.
    pub fn get_snapshot(
        env: &Env,
        token_id: &BytesN<32>,
        version: u32,
    ) -> Option<TokenVersionSnapshot> {
        env.storage()
            .persistent()
            .get(&DataKey::VersionSnapshot(token_id.clone(), version))
    }

    /// Append an upgrade record to the token's history.
    pub fn record_upgrade(env: &Env, record: &UpgradeRecord) {
        let key = DataKey::UpgradeHistory(record.token_id.clone());
        let mut history: Vec<UpgradeRecord> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| Vec::new(env));
        history.push_back(record.clone());
        env.storage().persistent().set(&key, &history);
    }

    /// Return the full upgrade history for a token.
    pub fn get_upgrade_history(env: &Env, token_id: &BytesN<32>) -> Vec<UpgradeRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::UpgradeHistory(token_id.clone()))
            .unwrap_or_else(|| Vec::new(env))
    }

    /// Count how many rollbacks have already occurred for a token.
    ///
    /// A rollback is any `UpgradeRecord` where `is_rollback == true`.
    pub fn count_rollbacks(env: &Env, token_id: &BytesN<32>) -> u32 {
        let history = Self::get_upgrade_history(env, token_id);
        let mut count: u32 = 0;
        for record in history.iter() {
            if record.is_rollback {
                count += 1;
            }
        }
        count
    }

    /// Apply a snapshot to a token, restoring it to a previous version's state.
    ///
    /// Identity fields (id, user, issue_date, renewal_attempts) are preserved.
    /// The version number is NOT reverted — it continues to increment so history
    /// is never lost.
    pub fn apply_snapshot_to_token(
        token: &MembershipToken,
        snapshot: &TokenVersionSnapshot,
        new_version: u32,
        rollback_label: Option<String>,
    ) -> MembershipToken {
        let _ = rollback_label; // label is stored in UpgradeRecord, not the token itself
        MembershipToken {
            id: token.id.clone(),
            user: token.user.clone(),
            status: snapshot.status.clone(),
            issue_date: token.issue_date,
            expiry_date: snapshot.expiry_date,
            tier_id: snapshot.tier_id.clone(),
            grace_period_entered_at: token.grace_period_entered_at,
            grace_period_expires_at: token.grace_period_expires_at,
            renewal_attempts: token.renewal_attempts,
            last_renewal_attempt_at: token.last_renewal_attempt_at,
            current_version: new_version,
        }
    }

    /// Migrate a token's mutable fields to a new version.
    ///
    /// Only the fields provided as `Some(...)` are updated; `None` means "keep
    /// existing value". Returns the updated token (caller must persist it).
    pub fn migrate_token_fields(
        token: &MembershipToken,
        new_version: u32,
        new_expiry_date: Option<u64>,
        new_tier_id: Option<Option<String>>,
        new_status: Option<MembershipStatus>,
    ) -> MembershipToken {
        MembershipToken {
            id: token.id.clone(),
            user: token.user.clone(),
            status: new_status.unwrap_or_else(|| token.status.clone()),
            issue_date: token.issue_date,
            expiry_date: new_expiry_date.unwrap_or(token.expiry_date),
            tier_id: new_tier_id.unwrap_or_else(|| token.tier_id.clone()),
            grace_period_entered_at: token.grace_period_entered_at,
            grace_period_expires_at: token.grace_period_expires_at,
            renewal_attempts: token.renewal_attempts,
            last_renewal_attempt_at: token.last_renewal_attempt_at,
            current_version: new_version,
        }
    }

    /// Build an `UpgradeRecord` for a successful upgrade or rollback.
    pub fn build_record(
        env: &Env,
        token_id: BytesN<32>,
        from_version: u32,
        to_version: u32,
        upgraded_by: Address,
        label: Option<String>,
        is_rollback: bool,
    ) -> UpgradeRecord {
        UpgradeRecord {
            token_id,
            from_version,
            to_version,
            upgraded_by,
            upgraded_at: env.ledger().timestamp(),
            label,
            is_rollback,
        }
    }
}
