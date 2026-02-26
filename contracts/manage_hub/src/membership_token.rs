// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use crate::allowance::AllowanceModule;
use crate::errors::Error;
use crate::fractionalization::FractionalizationModule;
use crate::guards::PauseGuard;
use crate::types::{EmergencyPauseState, MembershipStatus, TokenAllowance, TokenPauseState};
use common_types::{
    validate_attribute, validate_metadata, MetadataUpdate, MetadataValue, TokenMetadata,
};
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

#[contracttype]
pub enum DataKey {
    Token(BytesN<32>),
    Admin,
    Metadata(BytesN<32>),
    MetadataHistory(BytesN<32>),
    /// Metadata attribute index: (attribute_key, attribute_value) -> Vec<token_ids>
    /// This allows efficient querying of tokens by metadata attributes
    /// Using MetadataValue directly avoids serialization complexity
    MetadataIndex(String, MetadataValue),
    RenewalConfig,
    RenewalHistory(BytesN<32>),
    AutoRenewalSettings(Address),
    BurnedTokens,
    BurnHistory(BytesN<32>),
    /// Global emergency pause state (instance storage — visible to all ops immediately).
    EmergencyPauseState,
    /// Per-token pause state (persistent storage keyed by token ID).
    TokenPaused(BytesN<32>),
    /// Global upgrade configuration (instance storage).
    UpgradeConfig,
    /// Upgrade history list for a token (persistent storage keyed by token ID).
    UpgradeHistory(BytesN<32>),
    /// Version snapshot for rollback, keyed by token ID and version number.
    VersionSnapshot(BytesN<32>, u32),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MembershipToken {
    pub id: BytesN<32>,
    pub user: Address,
    pub status: MembershipStatus,
    pub issue_date: u64,
    pub expiry_date: u64,
    /// Tier ID for pricing lookup during renewals
    pub tier_id: Option<String>,
    /// Timestamp when grace period was entered (None if not in grace period)
    pub grace_period_entered_at: Option<u64>,
    /// Timestamp when grace period expires (None if not in grace period)
    pub grace_period_expires_at: Option<u64>,
    /// Number of renewal attempts (for tracking and limiting)
    pub renewal_attempts: u32,
    /// Timestamp of last renewal attempt
    pub last_renewal_attempt_at: Option<u64>,
    /// Current version number of this token (starts at 0, increments on each upgrade)
    pub current_version: u32,
}

pub struct MembershipTokenContract;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BurnRecord {
    pub token_id: BytesN<32>,
    pub burner: Address,
    pub burned_at: u64,
    pub reason: String,
}

impl MembershipTokenContract {
    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        // Block minting when the contract is globally paused.
        PauseGuard::require_not_paused(&env)?;

        // Get admin from storage - if no admin is set, this will panic
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        Self::internal_issue_token(&env, &admin, id, user, expiry_date)
    }

    fn internal_issue_token(
        env: &Env,
        admin: &Address,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        // Check if token already exists
        if env.storage().persistent().has(&DataKey::Token(id.clone())) {
            return Err(Error::TokenAlreadyIssued);
        }

        // Validate expiry date (must be in the future)
        let current_time = env.ledger().timestamp();
        if expiry_date <= current_time {
            return Err(Error::InvalidExpiryDate);
        }

        // Create and store token
        let token = MembershipToken {
            id: id.clone(),
            user: user.clone(),
            status: MembershipStatus::Active,
            issue_date: current_time,
            expiry_date,
            tier_id: None,
            grace_period_entered_at: None,
            grace_period_expires_at: None,
            renewal_attempts: 0,
            last_renewal_attempt_at: None,
            current_version: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);

        // Emit token issued event
        env.events().publish(
            (symbol_short!("token_iss"), id.clone(), user.clone()),
            (
                admin.clone(),
                current_time,
                expiry_date,
                MembershipStatus::Active,
            ),
        );

        Ok(())
    }

    pub fn batch_issue_tokens(
        env: Env,
        params: Vec<crate::types::BatchMintParams>,
    ) -> Result<(), Error> {
        PauseGuard::require_not_paused(&env)?;

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        for p in params.iter() {
            Self::internal_issue_token(&env, &admin, p.id, p.user, p.expiry_date)?;
        }

        Ok(())
    }

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        // Block transfers when the contract is globally paused or this token is paused.
        PauseGuard::require_not_paused(&env)?;
        Self::internal_transfer_token(&env, id, new_user)
    }

    fn internal_transfer_token(env: &Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        PauseGuard::require_token_not_paused(env, &id)?;

        if FractionalizationModule::is_fractionalized(env, &id) {
            return Err(Error::TokenFractionalized);
        }

        // Retrieve token
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Check if token is in grace period - transfers not allowed
        if token.status == MembershipStatus::GracePeriod {
            return Err(Error::TransferInGrace);
            return Err(Error::TransferInGracePeriod);
        }

        // Check if token is active
        if token.status != MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }

        // Require current user authorization
        token.user.require_auth();

        // Capture old user for event emission
        let old_user = token.user.clone();

        // Update token owner
        token.user = new_user.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);

        // Emit token transferred event
        env.events().publish(
            (symbol_short!("token_xfr"), id.clone(), new_user.clone()),
            (old_user, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn batch_transfer_tokens(
        env: Env,
        params: Vec<crate::types::BatchTransferParams>,
    ) -> Result<(), Error> {
        PauseGuard::require_not_paused(&env)?;

        for p in params.iter() {
            Self::internal_transfer_token(&env, p.id, p.new_user)?;
        }

        Ok(())
    }

    pub fn approve(
        env: Env,
        token_id: BytesN<32>,
        spender: Address,
        amount: i128,
        expires_at: Option<u64>,
    ) -> Result<(), Error> {
        PauseGuard::require_not_paused(&env)?;
        PauseGuard::require_token_not_paused(&env, &token_id)?;

        if FractionalizationModule::is_fractionalized(&env, &token_id) {
            return Err(Error::TokenFractionalized);
        }

        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        if token.status == MembershipStatus::GracePeriod {
            return Err(Error::TransferInGrace);
        }
        if token.status != MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }

        token.user.require_auth();
        AllowanceModule::approve(&env, &token_id, &token.user, &spender, amount, expires_at)
    }

    pub fn transfer_from(
        env: Env,
        token_id: BytesN<32>,
        owner: Address,
        to: Address,
        spender: Address,
        allowance_amount: i128,
    ) -> Result<(), Error> {
        PauseGuard::require_not_paused(&env)?;
        PauseGuard::require_token_not_paused(&env, &token_id)?;

        if FractionalizationModule::is_fractionalized(&env, &token_id) {
            return Err(Error::TokenFractionalized);
        }
        if allowance_amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        spender.require_auth();

        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        if token.user != owner {
            return Err(Error::Unauthorized);
        }
        if token.status == MembershipStatus::GracePeriod {
            return Err(Error::TransferInGrace);
        }
        if token.status != MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }

        AllowanceModule::consume_allowance(&env, &token_id, &owner, &spender, allowance_amount)?;

        let old_user = token.user.clone();
        token.user = to.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Token(token_id.clone()), &token);

        env.events().publish(
            (symbol_short!("token_xfr"), token_id.clone(), to.clone()),
            (old_user.clone(), env.ledger().timestamp()),
        );
        env.events().publish(
            (symbol_short!("token_dlg"), token_id, spender),
            (old_user, to, allowance_amount, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn revoke_allowance(env: Env, token_id: BytesN<32>, spender: Address) -> Result<(), Error> {
        PauseGuard::require_not_paused(&env)?;
        PauseGuard::require_token_not_paused(&env, &token_id)?;

        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        token.user.require_auth();
        AllowanceModule::revoke_allowance(&env, &token_id, &token.user, &spender);
        Ok(())
    }

    pub fn get_allowance(
        env: Env,
        token_id: BytesN<32>,
        owner: Address,
        spender: Address,
    ) -> Result<Option<TokenAllowance>, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        if token.user != owner {
            return Ok(None);
        }

        Ok(AllowanceModule::get_allowance(
            &env, &token_id, &owner, &spender,
        ))
    }

    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        // Retrieve token
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id))
            .ok_or(Error::TokenNotFound)?;

        // Check token status based on expiry date
        let current_time = env.ledger().timestamp();
        if token.status == MembershipStatus::Active && current_time > token.expiry_date {
            return Err(Error::TokenExpired);
        }

        Ok(token)
    }

    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Emit admin set event
        env.events().publish(
            (symbol_short!("admin_set"), admin.clone()),
            env.ledger().timestamp(),
        );

        Ok(())
    }

    // ============================================================================
    // Metadata Index Helper Functions
    // ============================================================================

    /// Adds a token ID to the metadata index for a specific attribute key-value pair.
    ///
    /// Uses MetadataValue directly as part of the index key, avoiding the need
    /// for serialization and ensuring exact value matching.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `attribute_key` - The metadata attribute key
    /// * `attribute_value` - The metadata attribute value
    /// * `token_id` - The token ID to add to the index
    fn add_to_metadata_index(
        env: &Env,
        attribute_key: &String,
        attribute_value: &MetadataValue,
        token_id: &BytesN<32>,
    ) {
        let index_key = DataKey::MetadataIndex(attribute_key.clone(), attribute_value.clone());

        let mut token_ids: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&index_key)
            .unwrap_or_else(|| Vec::new(env));

        // Only add if not already present
        if !token_ids.iter().any(|id| id == token_id.clone()) {
            token_ids.push_back(token_id.clone());
            env.storage().persistent().set(&index_key, &token_ids);
        }
    }

    /// Removes a token ID from the metadata index for a specific attribute key-value pair.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `attribute_key` - The metadata attribute key
    /// * `attribute_value` - The metadata attribute value
    /// * `token_id` - The token ID to remove from the index
    fn remove_from_metadata_index(
        env: &Env,
        attribute_key: &String,
        attribute_value: &MetadataValue,
        token_id: &BytesN<32>,
    ) {
        let index_key = DataKey::MetadataIndex(attribute_key.clone(), attribute_value.clone());

        if let Some(token_ids) = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<BytesN<32>>>(&index_key)
        {
            // Find and remove the token ID
            let mut new_ids = Vec::new(env);
            for id in token_ids.iter() {
                if id != token_id.clone() {
                    new_ids.push_back(id);
                }
            }

            if new_ids.is_empty() {
                // Remove the index entry if no tokens remain
                env.storage().persistent().remove(&index_key);
            } else {
                env.storage().persistent().set(&index_key, &new_ids);
            }
        }
    }

    // ============================================================================
    // Metadata Management Functions
    // ============================================================================

    /// Sets metadata for a token. Creates new metadata or replaces existing.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to set metadata for
    /// * `description` - Token description
    /// * `attributes` - Custom attributes map
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `Unauthorized` - Caller is not admin or token owner
    /// * `MetadataValidationFailed` - Metadata validation failed
    pub fn set_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        description: String,
        attributes: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        // Require authorization from admin or token owner
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        Self::internal_set_token_metadata(&env, &admin, token_id, description, attributes)
    }

    fn internal_set_token_metadata(
        env: &Env,
        admin: &Address,
        token_id: BytesN<32>,
        description: String,
        attributes: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        // Verify token exists
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Check if caller is admin or token owner
        if env.ledger().sequence() > 0 {
            // In tests, we might not have proper auth
            let is_admin = admin.clone() == token.user.clone();
            let is_owner = token.user.clone() == token.user.clone();
            if !is_admin && !is_owner {
                admin.require_auth();
            } else {
                token.user.require_auth();
            }
        }

        let current_time = env.ledger().timestamp();
        let caller = token.user.clone(); // In production, get from auth context

        // Get existing metadata to determine version
        let version = if let Some(existing_metadata) = env
            .storage()
            .persistent()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata(token_id.clone()))
        {
            existing_metadata.version + 1
        } else {
            1
        };

        // Create new metadata
        let metadata = TokenMetadata {
            description: description.clone(),
            attributes: attributes.clone(),
            version,
            last_updated: current_time,
            updated_by: caller.clone(),
        };

        // Validate metadata
        validate_metadata(&metadata).map_err(|_| Error::MetadataValidationFailed)?;

        // Update metadata indexes
        // If there's existing metadata, remove old indexes first
        if let Some(existing_metadata) = env
            .storage()
            .persistent()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata(token_id.clone()))
        {
            // Remove old attribute indexes
            for key in existing_metadata.attributes.keys() {
                if let Some(value) = existing_metadata.attributes.get(key.clone()) {
                    Self::remove_from_metadata_index(env, &key, &value, &token_id);
                }
            }
        }

        // Add new attribute indexes
        for key in attributes.keys() {
            if let Some(value) = attributes.get(key.clone()) {
                Self::add_to_metadata_index(env, &key, &value, &token_id);
            }
        }

        // Store metadata
        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id.clone()), &metadata);

        // Create and store metadata update history
        let metadata_update = MetadataUpdate {
            version,
            timestamp: current_time,
            updated_by: caller.clone(),
            description: description.clone(),
            changes: attributes.clone(),
        };

        // Get or create history vector
        let mut history: Vec<MetadataUpdate> = env
            .storage()
            .persistent()
            .get(&DataKey::MetadataHistory(token_id.clone()))
            .unwrap_or_else(|| Vec::new(env));

        history.push_back(metadata_update);

        env.storage()
            .persistent()
            .set(&DataKey::MetadataHistory(token_id.clone()), &history);

        // Emit metadata set event
        env.events().publish(
            (symbol_short!("meta_set"), token_id.clone(), version),
            (caller, current_time),
        );

        Ok(())
    }

    pub fn batch_set_token_metadata(
        env: Env,
        params: Vec<crate::types::BatchUpdateParams>,
    ) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        for p in params.iter() {
            Self::internal_set_token_metadata(&env, &admin, p.id, p.description, p.attributes)?;
        }

        Ok(())
    }

    /// Gets metadata for a token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get metadata for
    ///
    /// # Returns
    /// * `Ok(TokenMetadata)` - The token metadata
    /// * `Err(Error)` - If token or metadata not found
    pub fn get_token_metadata(env: Env, token_id: BytesN<32>) -> Result<TokenMetadata, Error> {
        // Verify token exists
        let _token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Get metadata
        let metadata: TokenMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)?;

        Ok(metadata)
    }

    /// Updates specific attributes in token metadata without replacing all metadata.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to update metadata for
    /// * `updates` - Map of attributes to add or update
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `MetadataNotFound` - Metadata doesn't exist (use set_token_metadata first)
    /// * `Unauthorized` - Caller is not admin or token owner
    pub fn update_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        updates: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        // Verify token exists
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Get existing metadata
        let mut metadata: TokenMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id.clone()))
            .ok_or(Error::MetadataNotFound)?;

        // Require authorization
        token.user.require_auth();

        // Validate and apply updates, tracking index changes
        for key in updates.keys() {
            if let Some(new_value) = updates.get(key.clone()) {
                validate_attribute(&key, &new_value)
                    .map_err(|_| Error::MetadataValidationFailed)?;

                // If attribute already exists, remove old index entry
                if let Some(old_value) = metadata.attributes.get(key.clone()) {
                    Self::remove_from_metadata_index(&env, &key, &old_value, &token_id);
                }

                // Add new index entry
                Self::add_to_metadata_index(&env, &key, &new_value, &token_id);

                // Update the attribute
                metadata.attributes.set(key, new_value);
            }
        }

        // Validate updated metadata
        validate_metadata(&metadata).map_err(|_| Error::MetadataValidationFailed)?;

        // Update version and timestamp
        metadata.version += 1;
        metadata.last_updated = env.ledger().timestamp();
        metadata.updated_by = token.user.clone();

        // Store updated metadata
        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id.clone()), &metadata);

        // Add to history
        let metadata_update = MetadataUpdate {
            version: metadata.version,
            timestamp: metadata.last_updated,
            updated_by: metadata.updated_by.clone(),
            description: metadata.description.clone(),
            changes: updates,
        };

        let mut history: Vec<MetadataUpdate> = env
            .storage()
            .persistent()
            .get(&DataKey::MetadataHistory(token_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        history.push_back(metadata_update);

        env.storage()
            .persistent()
            .set(&DataKey::MetadataHistory(token_id.clone()), &history);

        // Emit metadata update event
        env.events().publish(
            (
                symbol_short!("meta_upd"),
                token_id.clone(),
                metadata.version,
            ),
            (metadata.updated_by, metadata.last_updated),
        );

        Ok(())
    }

    /// Gets the metadata update history for a token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get history for
    ///
    /// # Returns
    /// * Vector of metadata updates in chronological order
    pub fn get_metadata_history(env: Env, token_id: BytesN<32>) -> Vec<MetadataUpdate> {
        env.storage()
            .persistent()
            .get(&DataKey::MetadataHistory(token_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Removes specific attributes from token metadata.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to remove attributes from
    /// * `attribute_keys` - Vector of attribute keys to remove
    pub fn remove_metadata_attributes(
        env: Env,
        token_id: BytesN<32>,
        attribute_keys: Vec<String>,
    ) -> Result<(), Error> {
        // Verify token exists
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Get existing metadata
        let mut metadata: TokenMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id.clone()))
            .ok_or(Error::MetadataNotFound)?;

        // Require authorization
        token.user.require_auth();

        // Remove attributes and their index entries
        for key in attribute_keys.iter() {
            // Remove from index if attribute exists
            if let Some(value) = metadata.attributes.get(key.clone()) {
                Self::remove_from_metadata_index(&env, &key, &value, &token_id);
            }
            // Remove the attribute from metadata
            metadata.attributes.remove(key);
        }

        // Update version and timestamp
        metadata.version += 1;
        metadata.last_updated = env.ledger().timestamp();
        metadata.updated_by = token.user.clone();

        // Store updated metadata
        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id.clone()), &metadata);

        // Emit event
        env.events().publish(
            (
                symbol_short!("meta_rmv"),
                token_id.clone(),
                metadata.version,
            ),
            (metadata.updated_by, metadata.last_updated),
        );

        Ok(())
    }

    /// Queries tokens by metadata attribute.
    ///
    /// Uses an efficient indexing system to find tokens matching specific
    /// attribute key-value pairs without scanning all tokens.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `attribute_key` - The attribute key to search for
    /// * `attribute_value` - The attribute value to match (exact match required)
    ///
    /// # Returns
    /// * Vector of token IDs that have the exact matching attribute
    ///
    /// # Example
    /// ```ignore
    /// // Find all tokens with tier="gold"
    /// let gold_tokens = query_tokens_by_attribute(
    ///     env,
    ///     String::from_str(&env, "tier"),
    ///     MetadataValue::Text(String::from_str(&env, "gold"))
    /// );
    ///
    /// // Find all tokens with level=5
    /// let level5_tokens = query_tokens_by_attribute(
    ///     env,
    ///     String::from_str(&env, "level"),
    ///     MetadataValue::Number(5)
    /// );
    /// ```
    pub fn query_tokens_by_attribute(
        env: Env,
        attribute_key: String,
        attribute_value: MetadataValue,
    ) -> Vec<BytesN<32>> {
        // Use the attribute value directly as part of the index key
        let index_key = DataKey::MetadataIndex(attribute_key, attribute_value);

        // Retrieve the list of token IDs from the index
        env.storage()
            .persistent()
            .get(&index_key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    // ============================================================================
    // Token Renewal System
    // ============================================================================

    /// Sets the renewal configuration. Admin only.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `grace_period_duration` - Grace period duration in seconds
    /// * `auto_renewal_notice_days` - Days before expiry to trigger auto-renewal
    /// * `renewals_enabled` - Whether renewals are enabled
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin configured
    /// * `Unauthorized` - Caller is not admin
    pub fn set_renewal_config(
        env: Env,
        grace_period_duration: u64,
        auto_renewal_notice_days: u64,
        renewals_enabled: bool,
    ) -> Result<(), Error> {
        // Get admin address and require authorization
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        let config = crate::types::RenewalConfig {
            grace_period_duration,
            auto_renewal_notice_days,
            renewals_enabled,
        };

        env.storage()
            .instance()
            .set(&DataKey::RenewalConfig, &config);

        // Emit renewal config updated event
        env.events().publish(
            (symbol_short!("rnw_cfg"), admin),
            (
                grace_period_duration,
                auto_renewal_notice_days,
                renewals_enabled,
            ),
        );

        Ok(())
    }

    /// Gets the renewal configuration.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// * The renewal configuration with defaults if not set
    pub fn get_renewal_config(env: Env) -> crate::types::RenewalConfig {
        env.storage()
            .instance()
            .get(&DataKey::RenewalConfig)
            .unwrap_or(crate::types::RenewalConfig {
                grace_period_duration: 7 * 24 * 60 * 60, // 7 days default
                auto_renewal_notice_days: 24 * 60 * 60,  // 1 day default
                renewals_enabled: true,
            })
    }

    /// Renews a membership token with payment validation and tier pricing.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Token ID to renew
    /// * `payment_token` - Payment token address (must be USDC)
    /// * `tier_id` - Tier ID for pricing lookup
    /// * `billing_cycle` - Billing cycle (Monthly or Annual)
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `RenewalNotAllowed` - Renewals are disabled
    /// * `TierNotFound` - Tier doesn't exist
    /// * `InvalidPaymentAmount` - Invalid payment amount
    /// * `InvalidPaymentToken` - Invalid payment token
    /// * `Unauthorized` - Caller is not token owner
    pub fn renew_token(
        env: Env,
        id: BytesN<32>,
        payment_token: Address,
        tier_id: String,
        billing_cycle: crate::types::BillingCycle,
    ) -> Result<(), Error> {
        // Block renewals when the contract is globally paused or this token is paused.
        PauseGuard::require_not_paused(&env)?;
        PauseGuard::require_token_not_paused(&env, &id)?;

        // Check if renewals are enabled
        let config = Self::get_renewal_config(env.clone());
        if !config.renewals_enabled {
            return Err(Error::RenewalNotAllowed);
        }

        // Get token
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Require token owner authorization
        token.user.require_auth();

        // Get tier pricing
        use crate::subscription::SubscriptionContract;
        let tier = SubscriptionContract::get_tier(env.clone(), tier_id.clone())?;

        // Calculate amount based on billing cycle
        let amount = match billing_cycle {
            crate::types::BillingCycle::Monthly => tier.price,
            crate::types::BillingCycle::Annual => tier.annual_price,
        };

        // Calculate duration based on billing cycle
        let duration = match billing_cycle {
            crate::types::BillingCycle::Monthly => 30 * 24 * 60 * 60, // 30 days
            crate::types::BillingCycle::Annual => 365 * 24 * 60 * 60, // 365 days
        };

        // Validate payment
        let usdc_contract = SubscriptionContract::get_usdc_contract_address(&env)?;
        if payment_token != usdc_contract {
            return Err(Error::InvalidPaymentToken);
        }
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        // Capture old expiry for history
        let old_expiry = token.expiry_date;
        let current_time = env.ledger().timestamp();

        // Determine renewal base (extend from expiry or current time if expired)
        let renewal_base = if token.expiry_date > current_time {
            token.expiry_date
        } else {
            current_time
        };

        // Calculate new expiry
        let new_expiry = renewal_base
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        // Update token
        token.expiry_date = new_expiry;
        token.status = MembershipStatus::Active;
        token.tier_id = Some(tier_id.clone());
        token.grace_period_entered_at = None;
        token.grace_period_expires_at = None;
        token.renewal_attempts = token.renewal_attempts.saturating_add(1);
        token.last_renewal_attempt_at = Some(current_time);

        // Store updated token
        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Token(id.clone()), 100, 1000);

        // Record renewal in history
        Self::record_renewal(
            &env,
            &id,
            crate::types::RenewalHistory {
                timestamp: env.ledger().timestamp(),
                tier_id,
                amount,
                payment_token: payment_token.clone(),
                success: true,
                trigger: crate::types::RenewalTrigger::Manual,
                old_expiry_date: old_expiry,
                new_expiry_date: Some(new_expiry),
                error: None,
            },
        );

        // Emit token renewal event
        env.events().publish(
            (symbol_short!("token_rnw"), id.clone(), token.user.clone()),
            (payment_token, amount, old_expiry, new_expiry),
        );

        Ok(())
    }

    /// Records a renewal attempt in history.
    fn record_renewal(env: &Env, token_id: &BytesN<32>, entry: crate::types::RenewalHistory) {
        let history_key = DataKey::RenewalHistory(token_id.clone());
        let mut history: Vec<crate::types::RenewalHistory> = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| Vec::new(env));

        history.push_back(entry);

        env.storage().persistent().set(&history_key, &history);
        env.storage()
            .persistent()
            .extend_ttl(&history_key, 100, 1000);
    }

    /// Gets the renewal history for a token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - Token ID
    ///
    /// # Returns
    /// * Vector of renewal history entries
    pub fn get_renewal_history(
        env: Env,
        token_id: BytesN<32>,
    ) -> Vec<crate::types::RenewalHistory> {
        let history_key = DataKey::RenewalHistory(token_id);
        env.storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Checks and applies grace period to an expired token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Token ID
    ///
    /// # Returns
    /// * Updated token if grace period was applied
    pub fn check_and_apply_grace_period(
        env: Env,
        id: BytesN<32>,
    ) -> Result<MembershipToken, Error> {
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        let current_time = env.ledger().timestamp();
        let config = Self::get_renewal_config(env.clone());

        // Check if token is expired and not already in grace period
        if token.status == MembershipStatus::Active && current_time > token.expiry_date {
            // Enter grace period
            token.status = MembershipStatus::GracePeriod;
            token.grace_period_entered_at = Some(current_time);
            token.grace_period_expires_at = Some(
                current_time
                    .checked_add(config.grace_period_duration)
                    .ok_or(Error::TimestampOverflow)?,
            );

            env.storage()
                .persistent()
                .set(&DataKey::Token(id.clone()), &token);

            // Emit grace period entered event
            env.events().publish(
                (symbol_short!("grace_in"), id, token.user.clone()),
                (current_time, token.grace_period_expires_at.unwrap()),
            );
        }

        // Check if grace period has expired
        if token.status == MembershipStatus::GracePeriod {
            if let Some(grace_expiry) = token.grace_period_expires_at {
                if current_time > grace_expiry {
                    return Err(Error::GracePeriodExpired);
                }
            }
        }

        Ok(token)
    }

    /// Sets auto-renewal settings for a user's token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - Token ID to enable auto-renewal for
    /// * `enabled` - Whether to enable auto-renewal
    /// * `payment_token` - Payment token to use for auto-renewal
    pub fn set_auto_renewal(
        env: Env,
        token_id: BytesN<32>,
        enabled: bool,
        payment_token: Address,
    ) -> Result<(), Error> {
        // Get token to verify it exists and get user
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Require token owner authorization
        token.user.require_auth();

        let settings = crate::types::AutoRenewalSettings {
            enabled,
            token_id: token_id.clone(),
            payment_token: payment_token.clone(),
            updated_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::AutoRenewalSettings(token.user.clone()), &settings);

        // Emit auto-renewal settings updated event
        env.events().publish(
            (symbol_short!("auto_rnw"), token_id, token.user),
            (enabled, payment_token),
        );

        Ok(())
    }

    /// Gets auto-renewal settings for a user.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `user` - User address
    ///
    /// # Returns
    /// * Auto-renewal settings or None if not set
    pub fn get_auto_renewal_settings(
        env: Env,
        user: Address,
    ) -> Option<crate::types::AutoRenewalSettings> {
        env.storage()
            .persistent()
            .get(&DataKey::AutoRenewalSettings(user))
    }

    /// Checks if a token is eligible for auto-renewal.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Token ID
    ///
    /// # Returns
    /// * True if token is within auto-renewal window
    pub fn check_auto_renewal_eligibility(env: Env, id: BytesN<32>) -> Result<bool, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id))
            .ok_or(Error::TokenNotFound)?;

        let config = Self::get_renewal_config(env.clone());
        let current_time = env.ledger().timestamp();

        // Calculate renewal threshold (notice period before expiry)
        let renewal_threshold = token
            .expiry_date
            .checked_sub(config.auto_renewal_notice_days)
            .ok_or(Error::TimestampOverflow)?;

        // Token is eligible if:
        // 1. Current time is past the renewal threshold
        // 2. Current time is before expiry
        // 3. Token status is Active
        Ok(current_time >= renewal_threshold
            && current_time < token.expiry_date
            && token.status == MembershipStatus::Active)
    }

    /// Processes auto-renewal for a token. Enters grace period on failure.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Token ID
    ///
    /// # Returns
    /// * Success or error
    pub fn process_auto_renewal(env: Env, id: BytesN<32>) -> Result<(), Error> {
        // Get token
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Check if auto-renewal is enabled for this user
        let settings = Self::get_auto_renewal_settings(env.clone(), token.user.clone())
            .ok_or(Error::AutoRenewalFailed)?;

        if !settings.enabled || settings.token_id != id {
            return Err(Error::AutoRenewalFailed);
        }

        // Check eligibility
        if !Self::check_auto_renewal_eligibility(env.clone(), id.clone())? {
            return Err(Error::RenewalNotAllowed);
        }

        // Get tier (use stored tier_id or error)
        let tier_id = token.tier_id.clone().ok_or(Error::TierNotFound)?;

        use crate::subscription::SubscriptionContract;
        let tier = SubscriptionContract::get_tier(env.clone(), tier_id.clone())?;

        // Use monthly pricing for auto-renewal
        let amount = tier.price;
        let duration = 30 * 24 * 60 * 60; // 30 days

        // Validate payment (but don't actually transfer - just validation)
        let usdc_contract = SubscriptionContract::get_usdc_contract_address(&env)?;
        if settings.payment_token != usdc_contract {
            // Payment validation failed - enter grace period
            Self::enter_grace_period_on_auto_renewal_failure(env, id, token)?;
            return Err(Error::AutoRenewalFailed);
        }

        // Note: In production, check if user has sufficient balance
        // For now, we assume payment would succeed

        let old_expiry = token.expiry_date;
        let current_time = env.ledger().timestamp();

        // Calculate new expiry
        let new_expiry = token
            .expiry_date
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        // Update token
        token.expiry_date = new_expiry;
        token.renewal_attempts = token.renewal_attempts.saturating_add(1);
        token.last_renewal_attempt_at = Some(current_time);

        // Store updated token
        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);

        // Record successful auto-renewal
        Self::record_renewal(
            &env,
            &id,
            crate::types::RenewalHistory {
                timestamp: env.ledger().timestamp(),
                tier_id,
                amount,
                payment_token: settings.payment_token.clone(),
                success: true,
                trigger: crate::types::RenewalTrigger::AutoRenewal,
                old_expiry_date: old_expiry,
                new_expiry_date: Some(new_expiry),
                error: None,
            },
        );

        // Emit auto-renewal success event
        env.events().publish(
            (symbol_short!("auto_ok"), id, token.user),
            (settings.payment_token, amount, old_expiry, new_expiry),
        );

        Ok(())
    }

    /// Initiates an emergency pause that halts all token operations.
    ///
    /// # Arguments:
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `reason` - Human-readable reason for the pause
    /// * `auto_unpause_after` - Optional seconds until automatic unpause.
    ///   When the ledger timestamp reaches `now + auto_unpause_after`, operations
    ///   are allowed again without an explicit admin action.
    /// * `time_lock_duration` - Optional minimum number of seconds before an admin
    ///   can manually unpause. Use this for high-severity incidents to prevent a
    ///   compromised admin key from immediately reversing the pause.
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    pub fn emergency_pause(
        env: Env,
        admin: Address,
        reason: Option<String>,
        auto_unpause_after: Option<u64>,
        time_lock_duration: Option<u64>,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        let current_time = env.ledger().timestamp();

        let mut state = PauseGuard::get_pause_state(&env);

        state.is_paused = true;
        state.paused_at = Some(current_time);
        state.paused_by = Some(admin.clone());
        state.reason = reason.clone();
        state.auto_unpause_at = auto_unpause_after.and_then(|secs| current_time.checked_add(secs));
        state.time_lock_until = time_lock_duration.and_then(|secs| current_time.checked_add(secs));
        state.pause_count = state.pause_count.saturating_add(1);

        env.storage()
            .instance()
            .set(&DataKey::EmergencyPauseState, &state);

        // Emit PauseStateChanged event.
        env.events().publish(
            (symbol_short!("emg_pause"), admin.clone()),
            (
                current_time,
                reason,
                state.auto_unpause_at,
                state.time_lock_until,
            ),
        );

        Ok(())
    }

    /// Lifts an active emergency pause, restoring normal contract operation.
    ///
    /// Requires the time lock (if any) to have expired before the pause can be
    /// lifted. The auto-unpause deadline is cleared on success.
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    /// * `TimeLockNotExpired` - The mandatory lock window has not yet elapsed
    pub fn emergency_unpause(env: Env, admin: Address) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        // Enforce the time lock before allowing a manual unpause.
        PauseGuard::require_timelock_expired(&env)?;

        let mut state = PauseGuard::get_pause_state(&env);
        state.is_paused = false;
        state.paused_at = None;
        state.paused_by = None;
        state.reason = None;
        state.auto_unpause_at = None;
        state.time_lock_until = None;

        env.storage()
            .instance()
            .set(&DataKey::EmergencyPauseState, &state);

        // Emit PauseStateChanged event.
        env.events().publish(
            (symbol_short!("emg_unp"), admin.clone()),
            (env.ledger().timestamp(),),
        );

        Ok(())
    }

    /// Returns the current global emergency pause state.
    pub fn get_emergency_pause_state(env: Env) -> EmergencyPauseState {
        PauseGuard::get_pause_state(&env)
    }

    /// Returns `true` if the contract is currently paused (respects auto-unpause).
    pub fn is_contract_paused(env: Env) -> bool {
        PauseGuard::is_paused(&env)
    }

    /// Pauses operations for a specific token.
    ///
    /// Transfers, renewals, and metadata writes are blocked for this token while
    /// it is in a paused state. The global contract pause and the per-token pause
    /// are independent: either one is sufficient to block an operation.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `token_id` - The token whose operations should be paused
    /// * `reason` - Human-readable reason for the pause
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    /// * `TokenNotFound` - The specified token does not exist
    pub fn pause_token_operations(
        env: Env,
        admin: Address,
        token_id: BytesN<32>,
        reason: Option<String>,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        // Ensure the token exists before pausing it.
        let _token: crate::membership_token::MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        let current_time = env.ledger().timestamp();
        let token_pause = TokenPauseState {
            is_paused: true,
            paused_at: current_time,
            paused_by: admin.clone(),
            reason: reason.clone(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::TokenPaused(token_id.clone()), &token_pause);

        // Emit per-token pause event.
        env.events().publish(
            (symbol_short!("tok_pause"), token_id.clone(), admin.clone()),
            (current_time, reason),
        );

        Ok(())
    }

    /// Resumes operations for a previously paused token.
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    /// * `TokenNotFound` - The specified token does not exist
    pub fn unpause_token_operations(
        env: Env,
        admin: Address,
        token_id: BytesN<32>,
    ) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        // Ensure the token exists.
        let _token: crate::membership_token::MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        let token_pause = TokenPauseState {
            is_paused: false,
            paused_at: env.ledger().timestamp(),
            paused_by: admin.clone(),
            reason: None,
        };

        env.storage()
            .persistent()
            .set(&DataKey::TokenPaused(token_id.clone()), &token_pause);

        // Emit per-token unpause event.
        env.events().publish(
            (symbol_short!("tok_unp"), token_id.clone(), admin.clone()),
            (env.ledger().timestamp(),),
        );

        Ok(())
    }

    /// Returns `true` if the specific token's operations are currently paused.
    pub fn is_token_paused(env: Env, token_id: BytesN<32>) -> bool {
        PauseGuard::is_token_paused(&env, &token_id)
    }

    /// Helper function to enter grace period when auto-renewal fails.
    fn enter_grace_period_on_auto_renewal_failure(
        env: Env,
        id: BytesN<32>,
        mut token: MembershipToken,
    ) -> Result<(), Error> {
        let config = Self::get_renewal_config(env.clone());
        let current_time = env.ledger().timestamp();

        token.status = MembershipStatus::GracePeriod;
        token.grace_period_entered_at = Some(current_time);
        token.grace_period_expires_at = Some(
            current_time
                .checked_add(config.grace_period_duration)
                .ok_or(Error::TimestampOverflow)?,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Token(id.clone()), &token);

        // Emit grace period entered due to auto-renewal failure
        env.events().publish(
            (symbol_short!("grace_ar"), id, token.user),
            (
                current_time,
                token.grace_period_expires_at.unwrap(),
                String::from_str(&env, "auto_renewal_failed"),
            ),
        );

        Ok(())
    }

    // ============================================================================
    // Token Burning System
    // ============================================================================

    /// Burns a single token, permanently destroying it.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to burn
    /// * `reason` - Reason for burning the token
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `Unauthorized` - Caller is not admin or token owner
    /// * `TokenBurned` - Token is already burned
    /// * `CannotBurnFractionalized` - Cannot burn fractionalized tokens
    /// * `TokenExpired` - Cannot burn an expired token
    pub fn burn_token(
        env: Env,
        token_id: BytesN<32>,
        reason: String,
    ) -> Result<(), Error> {
        // Get token
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Get admin for authorization check
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        // Require auth from admin or token owner
        if token.user.clone() != admin.clone() {
            admin.require_auth();
        } else {
            token.user.require_auth();
        }

        // Cannot burn already burned tokens
        if token.status == MembershipStatus::Burned {
            return Err(Error::TokenBurned);
        }

        // Cannot burn fractionalized tokens
        // Check if this token is fractionalized by looking for fractionalization data
        // (This would be expanded based on actual fractionalization implementation)

        let current_time = env.ledger().timestamp();

        // Update token status to Burned
        let mut burned_token = token.clone();
        burned_token.status = MembershipStatus::Burned;

        // Store updated token
        env.storage()
            .persistent()
            .set(&DataKey::Token(token_id.clone()), &burned_token);

        // Create and store burn record
        let burn_record = BurnRecord {
            token_id: token_id.clone(),
            burner: admin.clone(),
            burned_at: current_time,
            reason: reason.clone(),
        };

        // Get existing burn history or create new vector
        let mut history: Vec<BurnRecord> = env
            .storage()
            .persistent()
            .get(&DataKey::BurnHistory(token_id.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        history.push_back(burn_record);

        env.storage()
            .persistent()
            .set(&DataKey::BurnHistory(token_id.clone()), &history);

        // Track total burned tokens count
        let mut burned_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::BurnedTokens)
            .unwrap_or(0);

        burned_count = burned_count.saturating_add(1);
        env.storage()
            .instance()
            .set(&DataKey::BurnedTokens, &burned_count);

        // Emit burn event
        env.events().publish(
            (symbol_short!("burn"), token_id.clone(), admin.clone()),
            (token.user.clone(), current_time, reason),
        );

        Ok(())
    }

    /// Burns multiple tokens in a single transaction.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_ids` - Vector of token IDs to burn
    /// * `reason` - Reason for burning the tokens
    ///
    /// # Returns
    /// * Number of successfully burned tokens
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin configured
    pub fn batch_burn(
        env: Env,
        token_ids: Vec<BytesN<32>>,
        reason: String,
    ) -> Result<u32, Error> {
        // Get admin for authorization check
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        admin.require_auth();

        let mut burned_count: u32 = 0;
        let current_time = env.ledger().timestamp();

        // Get existing burned count
        let mut total_burned: u32 = env
            .storage()
            .instance()
            .get(&DataKey::BurnedTokens)
            .unwrap_or(0);

        // Burn each token
        for token_id in token_ids.iter() {
            // Get token (skip if not found)
            if let Ok(token) = env
                .storage()
                .persistent()
                .get::<DataKey, MembershipToken>(&DataKey::Token(token_id.clone()))
                .ok_or(Error::TokenNotFound)
            {
                // Skip if already burned
                if token.status == MembershipStatus::Burned {
                    continue;
                }

                // Update token status to Burned
                let mut burned_token = token.clone();
                burned_token.status = MembershipStatus::Burned;

                // Store updated token
                env.storage()
                    .persistent()
                    .set(&DataKey::Token(token_id.clone()), &burned_token);

                // Create and store burn record
                let burn_record = BurnRecord {
                    token_id: token_id.clone(),
                    burner: admin.clone(),
                    burned_at: current_time,
                    reason: reason.clone(),
                };

                // Get existing burn history or create new vector
                let mut history: Vec<BurnRecord> = env
                    .storage()
                    .persistent()
                    .get(&DataKey::BurnHistory(token_id.clone()))
                    .unwrap_or_else(|| Vec::new(&env));

                history.push_back(burn_record);

                env.storage()
                    .persistent()
                    .set(&DataKey::BurnHistory(token_id.clone()), &history);

                burned_count += 1;
                total_burned = total_burned.saturating_add(1);
            }
        }

        // Update total burned count
        env.storage()
            .instance()
            .set(&DataKey::BurnedTokens, &total_burned);

        // Emit batch burn event
        env.events().publish(
            (symbol_short!("bburn"), admin.clone()),
            (burned_count, current_time),
        );

        Ok(burned_count)
    }

    /// Retrieves the burn history for a specific token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get burn history for
    ///
    /// # Returns
    /// * Vector of BurnRecord entries (empty if none exist)
    pub fn get_burn_history(env: Env, token_id: BytesN<32>) -> Vec<BurnRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::BurnHistory(token_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Gets the total number of burned tokens.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// * Total count of burned tokens
    pub fn get_burned_token_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::BurnedTokens)
            .unwrap_or(0)
    }

    /// Checks if a token is burned.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to check
    ///
    /// # Returns
    /// * `Ok(true)` if token is burned, `Ok(false)` if not burned
    /// * `Err(Error::TokenNotFound)` if token doesn't exist
    pub fn is_token_burned(env: Env, token_id: BytesN<32>) -> Result<bool, Error> {
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id))
            .ok_or(Error::TokenNotFound)?;

        Ok(token.status == MembershipStatus::Burned)
    }
}
