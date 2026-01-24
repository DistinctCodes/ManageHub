#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, Map, String, Vec};

mod attendance_log;
mod errors;
mod membership_token;
mod subscription;
mod types;

use attendance_log::{AttendanceLog, AttendanceLogModule};
use common_types::{MetadataUpdate, MetadataValue, TokenMetadata};
use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};
use subscription::SubscriptionContract;
use types::{
    AttendanceAction, BillingCycle, Subscription, SubscriptionTier, TierAnalytics, TierFeature,
    TierLevel, TierPromotion, UserSubscriptionInfo,
};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        MembershipTokenContract::issue_token(env, id, user, expiry_date)?;
        Ok(())
    }

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        MembershipTokenContract::transfer_token(env, id, new_user)?;
        Ok(())
    }

    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        MembershipTokenContract::get_token(env, id)
    }

    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        MembershipTokenContract::set_admin(env, admin)?;
        Ok(())
    }

    pub fn log_attendance(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: soroban_sdk::Map<String, String>,
    ) -> Result<(), Error> {
        AttendanceLogModule::log_attendance(env, id, user_id, action, details)
    }

    pub fn get_logs_for_user(env: Env, user_id: Address) -> Vec<AttendanceLog> {
        AttendanceLogModule::get_logs_for_user(env, user_id)
    }

    pub fn get_attendance_log(env: Env, id: BytesN<32>) -> Option<AttendanceLog> {
        AttendanceLogModule::get_attendance_log(env, id)
    }

    pub fn create_subscription(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        SubscriptionContract::create_subscription(env, id, user, payment_token, amount, duration)
    }

    pub fn renew_subscription(
        env: Env,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        SubscriptionContract::renew_subscription(env, id, payment_token, amount, duration)
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        SubscriptionContract::get_subscription(env, id)
    }

    pub fn cancel_subscription(env: Env, id: String) -> Result<(), Error> {
        SubscriptionContract::cancel_subscription(env, id)
    }

    pub fn set_usdc_contract(env: Env, admin: Address, usdc_address: Address) -> Result<(), Error> {
        SubscriptionContract::set_usdc_contract(env, admin, usdc_address)
    }

    // ============================================================================
    // Tier Management Endpoints
    // ============================================================================

    /// Creates a new subscription tier. Admin only.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `id` - Unique tier identifier
    /// * `name` - Human-readable tier name
    /// * `level` - Tier level (Free, Basic, Pro, Enterprise)
    /// * `price` - Monthly price in smallest token unit
    /// * `annual_price` - Annual price (usually discounted)
    /// * `features` - List of features enabled for this tier
    /// * `max_users` - Maximum users allowed (0 = unlimited)
    /// * `max_storage` - Maximum storage in bytes (0 = unlimited)
    pub fn create_tier(
        env: Env,
        admin: Address,
        id: String,
        name: String,
        level: TierLevel,
        price: i128,
        annual_price: i128,
        features: Vec<TierFeature>,
        max_users: u32,
        max_storage: u64,
    ) -> Result<(), Error> {
        SubscriptionContract::create_tier(
            env,
            admin,
            id,
            name,
            level,
            price,
            annual_price,
            features,
            max_users,
            max_storage,
        )
    }

    /// Updates an existing subscription tier. Admin only.
    pub fn update_tier(
        env: Env,
        admin: Address,
        id: String,
        name: Option<String>,
        price: Option<i128>,
        annual_price: Option<i128>,
        features: Option<Vec<TierFeature>>,
        max_users: Option<u32>,
        max_storage: Option<u64>,
        is_active: Option<bool>,
    ) -> Result<(), Error> {
        SubscriptionContract::update_tier(
            env,
            admin,
            id,
            name,
            price,
            annual_price,
            features,
            max_users,
            max_storage,
            is_active,
        )
    }

    /// Gets a subscription tier by ID.
    pub fn get_tier(env: Env, id: String) -> Result<SubscriptionTier, Error> {
        SubscriptionContract::get_tier(env, id)
    }

    /// Gets all subscription tiers.
    pub fn get_all_tiers(env: Env) -> Vec<SubscriptionTier> {
        SubscriptionContract::get_all_tiers(env)
    }

    /// Gets only active tiers available for purchase.
    pub fn get_active_tiers(env: Env) -> Vec<SubscriptionTier> {
        SubscriptionContract::get_active_tiers(env)
    }

    /// Deactivates a tier (soft delete). Admin only.
    pub fn deactivate_tier(env: Env, admin: Address, id: String) -> Result<(), Error> {
        SubscriptionContract::deactivate_tier(env, admin, id)
    }

    // ============================================================================
    // Subscription with Tier Support Endpoints
    // ============================================================================

    /// Creates a subscription with tier support.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Unique subscription identifier
    /// * `user` - User address
    /// * `payment_token` - Token used for payment
    /// * `tier_id` - ID of the tier to subscribe to
    /// * `billing_cycle` - Monthly or Annual billing
    /// * `promo_code` - Optional promotion code for discounts
    pub fn create_subscription_with_tier(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        tier_id: String,
        billing_cycle: BillingCycle,
        promo_code: Option<String>,
    ) -> Result<(), Error> {
        SubscriptionContract::create_subscription_with_tier(
            env,
            id,
            user,
            payment_token,
            tier_id,
            billing_cycle,
            promo_code,
        )
    }

    /// Gets detailed subscription info including tier details.
    pub fn get_user_subscription_info(
        env: Env,
        subscription_id: String,
    ) -> Result<UserSubscriptionInfo, Error> {
        SubscriptionContract::get_user_subscription_info(env, subscription_id)
    }

    // ============================================================================
    // Tier Change (Upgrade/Downgrade) Endpoints
    // ============================================================================

    /// Initiates a tier change request (upgrade or downgrade).
    ///
    /// # Returns
    /// * `Ok(String)` - The change request ID
    pub fn request_tier_change(
        env: Env,
        user: Address,
        subscription_id: String,
        new_tier_id: String,
    ) -> Result<String, Error> {
        SubscriptionContract::request_tier_change(env, user, subscription_id, new_tier_id)
    }

    /// Processes a tier change request.
    pub fn process_tier_change(
        env: Env,
        caller: Address,
        change_request_id: String,
        subscription_id: String,
        payment_token: Address,
    ) -> Result<(), Error> {
        SubscriptionContract::process_tier_change(
            env,
            caller,
            change_request_id,
            subscription_id,
            payment_token,
        )
    }

    /// Cancels a pending tier change request.
    pub fn cancel_tier_change(
        env: Env,
        user: Address,
        change_request_id: String,
    ) -> Result<(), Error> {
        SubscriptionContract::cancel_tier_change(env, user, change_request_id)
    }

    // ============================================================================
    // Promotion Management Endpoints
    // ============================================================================

    /// Creates a promotional pricing for a tier. Admin only.
    pub fn create_promotion(
        env: Env,
        admin: Address,
        promo_id: String,
        tier_id: String,
        discount_percent: u32,
        promo_price: i128,
        start_date: u64,
        end_date: u64,
        promo_code: String,
        max_redemptions: u32,
    ) -> Result<(), Error> {
        SubscriptionContract::create_promotion(
            env,
            admin,
            promo_id,
            tier_id,
            discount_percent,
            promo_price,
            start_date,
            end_date,
            promo_code,
            max_redemptions,
        )
    }

    /// Gets a promotion by ID.
    pub fn get_promotion(env: Env, promo_id: String) -> Result<TierPromotion, Error> {
        SubscriptionContract::get_promotion(env, promo_id)
    }

    // ============================================================================
    // Feature Access Control Endpoints
    // ============================================================================

    /// Checks if a subscription has access to a specific feature.
    pub fn check_feature_access(
        env: Env,
        subscription_id: String,
        feature: TierFeature,
    ) -> Result<bool, Error> {
        SubscriptionContract::check_feature_access(env, subscription_id, feature)
    }

    /// Enforces feature access, returns error if not available.
    pub fn require_feature_access(
        env: Env,
        subscription_id: String,
        feature: TierFeature,
    ) -> Result<(), Error> {
        SubscriptionContract::require_feature_access(env, subscription_id, feature)
    }

    // ============================================================================
    // Tier Analytics Endpoints
    // ============================================================================

    /// Gets analytics for a specific tier.
    pub fn get_tier_analytics(env: Env, tier_id: String) -> Result<TierAnalytics, Error> {
        SubscriptionContract::get_tier_analytics(env, tier_id)
    }

    // ============================================================================
    // Token Metadata Endpoints
    // ============================================================================

    /// Sets metadata for a membership token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to set metadata for
    /// * `description` - Token description (max 500 chars)
    /// * `attributes` - Custom attributes map (max 20 attributes)
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
        MembershipTokenContract::set_token_metadata(env, token_id, description, attributes)
    }

    /// Gets metadata for a membership token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get metadata for
    ///
    /// # Returns
    /// * `Ok(TokenMetadata)` - The token metadata
    /// * `Err(Error)` - If token or metadata not found
    pub fn get_token_metadata(env: Env, token_id: BytesN<32>) -> Result<TokenMetadata, Error> {
        MembershipTokenContract::get_token_metadata(env, token_id)
    }

    /// Updates specific attributes in token metadata.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to update metadata for
    /// * `updates` - Map of attributes to add or update
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `MetadataNotFound` - Metadata doesn't exist
    /// * `Unauthorized` - Caller is not admin or token owner
    pub fn update_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        updates: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        MembershipTokenContract::update_token_metadata(env, token_id, updates)
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
        MembershipTokenContract::get_metadata_history(env, token_id)
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
        MembershipTokenContract::remove_metadata_attributes(env, token_id, attribute_keys)
    }

    /// Queries tokens by metadata attribute.
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
        attribute_key: String,
        attribute_value: MetadataValue,
    ) -> Vec<BytesN<32>> {
        MembershipTokenContract::query_tokens_by_attribute(env, attribute_key, attribute_value)
    }
}

mod test;
