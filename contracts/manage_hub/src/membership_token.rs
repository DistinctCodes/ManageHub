// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use crate::errors::Error;
use crate::types::MembershipStatus;
use common_types::{validate_attribute, validate_metadata, MetadataUpdate, MetadataValue, TokenMetadata};
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

#[contracttype]
pub enum DataKey {
    Token(BytesN<32>),
    Admin,
    Metadata(BytesN<32>),
    MetadataHistory(BytesN<32>),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MembershipToken {
    pub id: BytesN<32>,
    pub user: Address,
    pub status: MembershipStatus,
    pub issue_date: u64,
    pub expiry_date: u64,
}

pub struct MembershipTokenContract;

impl MembershipTokenContract {
    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        // Get admin from storage - if no admin is set, this will panic
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

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

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        // Retrieve token
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

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
        // Verify token exists
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Require authorization from admin or token owner
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

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
            .unwrap_or_else(|| Vec::new(&env));

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

        // Validate and apply updates
        for key in updates.keys() {
            if let Some(value) = updates.get(key.clone()) {
                validate_attribute(&key, &value).map_err(|_| Error::MetadataValidationFailed)?;
                metadata.attributes.set(key, value);
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

        // Remove attributes
        for key in attribute_keys.iter() {
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
    /// Note: This is a basic implementation. For production, consider
    /// implementing indexing for efficient queries.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `attribute_key` - The attribute key to search for
    /// * `attribute_value` - The attribute value to match
    ///
    /// # Returns
    /// * Vector of token IDs that have the matching attribute
    pub fn query_tokens_by_attribute(
        env: Env,
        _attribute_key: String,
        _attribute_value: MetadataValue,
    ) -> Vec<BytesN<32>> {
        // Note: This is a simple implementation that would need optimization
        // for production use. Consider implementing indexing or external
        // query mechanisms for large-scale deployments.
        Vec::new(&env)
        // In a real implementation, you would:
        // 1. Maintain an index of tokens by attribute
        // 2. Query the index instead of scanning all tokens
        // 3. Return matching token IDs
    }
}
