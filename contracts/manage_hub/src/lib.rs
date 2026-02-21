#![no_std]
//! # ManageHub Contract
//!
//! ## Multisig Integration for Critical Operations
//!
//! This contract integrates with the access_control contract for multi-signature
//! operations on critical functions. Critical operations that should require
//! multisig approval include:
//!
//! - `set_admin`: Changing admin privileges
//! - `set_usdc_contract`: Updating payment contracts
//! - `set_pause_config`: Modifying pause configuration
//! - `pause_subscription_admin`: Admin-level subscription actions
//!
//! ### Example Integration:
//!
//! ```rust,ignore
//! use access_control::{AccessControl, ProposalAction, UserRole};
//!
//! // Instead of direct admin operations, create a proposal:
//! pub fn set_admin_multisig(env: Env, proposer: Address, new_admin: Address) -> u64 {
//!     let access_control = AccessControl::new(&env, &ACCESS_CONTROL_CONTRACT);
//!     access_control.create_proposal(
//!         &proposer,
//!         &ProposalAction::SetRole(new_admin, UserRole::Admin)
//!     )
//! }
//!
//! // Critical operations can check if multisig is required:
//! fn require_admin_or_multisig(env: &Env, caller: &Address) -> Result<(), Error> {
//!     let access_control = AccessControl::new(env, &ACCESS_CONTROL_CONTRACT);
//!
//!     // Check if multisig is enabled
//!     if access_control.is_multisig_enabled() {
//!         // For multisig mode, require proposal-based execution
//!         if !access_control.check_access(caller, &UserRole::Admin) {
//!             return Err(Error::Unauthorized);
//!         }
//!     } else {
//!         // Single admin mode
//!         if !access_control.is_admin(caller) {
//!             return Err(Error::Unauthorized);
//!         }
//!     }
//!     Ok(())
//! }
//! ```
//!
//! ### Time-Locked Operations:
//!
//! High-value operations like contract upgrades should use time-locked proposals:
//!
//! ```rust,ignore
//! let proposal_id = access_control.create_proposal(
//!     &proposer,
//!     &ProposalAction::ScheduleUpgrade(new_contract_address, execution_time)
//! );
//! // This proposal will require critical_threshold approvals
//! // and will be executable only after time_lock_duration
//! ```
//!
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, Map, String, Vec};

mod allowance;
mod attendance_log;
mod errors;
mod fractionalization;
mod guards;
mod membership_token;
mod migration;
mod pause_errors;
mod rewards;
mod staking;
mod staking_errors;
mod subscription;
mod types;
mod upgrade;
mod upgrade_errors;

use attendance_log::{AttendanceLog, AttendanceLogModule};
use common_types::{
    AttendanceFrequency, DateRange, DayPattern, MetadataUpdate, MetadataValue, PeakHourData,
    TimePeriod, TokenMetadata, UserAttendanceStats,
};
use errors::Error;
use fractionalization::FractionalizationModule;
use membership_token::{MembershipToken, MembershipTokenContract};
use staking::StakingModule;
use subscription::SubscriptionContract;
use types::{
    AttendanceAction, AttendanceSummary, BatchUpgradeResult, BillingCycle, CreatePromotionParams,
    CreateTierParams, DividendDistribution, EmergencyPauseState, FractionHolder, MembershipStatus,
    PauseConfig, PauseHistoryEntry, PauseStats, StakeInfo, StakingConfig, StakingTier,
    Subscription, SubscriptionTier, TierAnalytics, TierFeature, TierPromotion, TokenAllowance,
    UpdateTierParams, UpgradeConfig, UpgradeRecord, UserSubscriptionInfo,
};
use upgrade::UpgradeModule;

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

    pub fn approve(
        env: Env,
        token_id: BytesN<32>,
        spender: Address,
        amount: i128,
        expires_at: Option<u64>,
    ) -> Result<(), Error> {
        MembershipTokenContract::approve(env, token_id, spender, amount, expires_at)?;
        Ok(())
    }

    pub fn transfer_from(
        env: Env,
        token_id: BytesN<32>,
        owner: Address,
        to: Address,
        spender: Address,
        allowance_amount: i128,
    ) -> Result<(), Error> {
        MembershipTokenContract::transfer_from(env, token_id, owner, to, spender, allowance_amount)
    }

    pub fn revoke_allowance(env: Env, token_id: BytesN<32>, spender: Address) -> Result<(), Error> {
        MembershipTokenContract::revoke_allowance(env, token_id, spender)?;
        Ok(())
    }

    pub fn get_allowance(
        env: Env,
        token_id: BytesN<32>,
        owner: Address,
        spender: Address,
    ) -> Result<Option<TokenAllowance>, Error> {
        MembershipTokenContract::get_allowance(env, token_id, owner, spender)
    }

    pub fn fractionalize_token(
        env: Env,
        token_id: BytesN<32>,
        total_shares: i128,
        min_fraction_size: i128,
    ) -> Result<(), Error> {
        FractionalizationModule::fractionalize_token(env, token_id, total_shares, min_fraction_size)
    }

    pub fn transfer_fraction(
        env: Env,
        token_id: BytesN<32>,
        from: Address,
        to: Address,
        share_amount: i128,
    ) -> Result<(), Error> {
        FractionalizationModule::transfer_fraction(env, token_id, from, to, share_amount)
    }

    pub fn recombine_fractions(
        env: Env,
        token_id: BytesN<32>,
        holder: Address,
    ) -> Result<(), Error> {
        FractionalizationModule::recombine_fractions(env, token_id, holder)
    }

    pub fn get_fraction_holders(
        env: Env,
        token_id: BytesN<32>,
    ) -> Result<Vec<FractionHolder>, Error> {
        FractionalizationModule::get_fraction_holders(env, token_id)
    }

    pub fn distribute_fraction_rewards(
        env: Env,
        token_id: BytesN<32>,
        total_amount: i128,
    ) -> Result<DividendDistribution, Error> {
        FractionalizationModule::distribute_fraction_rewards(env, token_id, total_amount)
    }

    pub fn get_pending_fraction_reward(
        env: Env,
        token_id: BytesN<32>,
        holder: Address,
    ) -> Result<i128, Error> {
        FractionalizationModule::get_pending_fraction_reward(env, token_id, holder)
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

    pub fn pause_subscription(env: Env, id: String, reason: Option<String>) -> Result<(), Error> {
        SubscriptionContract::pause_subscription(env, id, reason)
    }

    pub fn resume_subscription(env: Env, id: String) -> Result<(), Error> {
        SubscriptionContract::resume_subscription(env, id)
    }

    pub fn pause_subscription_admin(
        env: Env,
        id: String,
        admin: Address,
        reason: Option<String>,
    ) -> Result<(), Error> {
        SubscriptionContract::pause_subscription_admin(env, id, admin, reason)
    }

    pub fn resume_subscription_admin(env: Env, id: String, admin: Address) -> Result<(), Error> {
        SubscriptionContract::resume_subscription_admin(env, id, admin)
    }

    pub fn set_pause_config(env: Env, admin: Address, config: PauseConfig) -> Result<(), Error> {
        SubscriptionContract::set_pause_config(env, admin, config)
    }

    pub fn get_pause_config(env: Env) -> PauseConfig {
        SubscriptionContract::get_pause_config(env)
    }

    pub fn get_pause_history(env: Env, id: String) -> Result<Vec<PauseHistoryEntry>, Error> {
        SubscriptionContract::get_pause_history(env, id)
    }

    pub fn get_pause_stats(env: Env, id: String) -> Result<PauseStats, Error> {
        SubscriptionContract::get_pause_stats(env, id)
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
    /// * `params` - Tier creation parameters (id, name, level, prices, features, limits)
    pub fn create_tier(env: Env, admin: Address, params: CreateTierParams) -> Result<(), Error> {
        SubscriptionContract::create_tier(env, admin, params)
    }

    /// Updates an existing subscription tier. Admin only.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `params` - Update parameters (id required, other fields optional)
    pub fn update_tier(env: Env, admin: Address, params: UpdateTierParams) -> Result<(), Error> {
        SubscriptionContract::update_tier(env, admin, params)
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
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `params` - Promotion parameters (promo_id, tier_id, discount, dates, code, limits)
    pub fn create_promotion(
        env: Env,
        admin: Address,
        params: CreatePromotionParams,
    ) -> Result<(), Error> {
        SubscriptionContract::create_promotion(env, admin, params)
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

    // ============================================================================
    // Token Renewal System Endpoints
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
        MembershipTokenContract::set_renewal_config(
            env,
            grace_period_duration,
            auto_renewal_notice_days,
            renewals_enabled,
        )
    }

    /// Gets the renewal configuration.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// * The renewal configuration with defaults if not set
    pub fn get_renewal_config(env: Env) -> types::RenewalConfig {
        MembershipTokenContract::get_renewal_config(env)
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
        billing_cycle: BillingCycle,
    ) -> Result<(), Error> {
        MembershipTokenContract::renew_token(env, id, payment_token, tier_id, billing_cycle)
    }

    /// Gets the renewal history for a token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - Token ID
    ///
    /// # Returns
    /// * Vector of renewal history entries
    pub fn get_renewal_history(env: Env, token_id: BytesN<32>) -> Vec<types::RenewalHistory> {
        MembershipTokenContract::get_renewal_history(env, token_id)
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
        MembershipTokenContract::check_and_apply_grace_period(env, id)
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
        MembershipTokenContract::set_auto_renewal(env, token_id, enabled, payment_token)
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
    ) -> Option<types::AutoRenewalSettings> {
        MembershipTokenContract::get_auto_renewal_settings(env, user)
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
        MembershipTokenContract::check_auto_renewal_eligibility(env, id)
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
        MembershipTokenContract::process_auto_renewal(env, id)
    }

    // ============================================================================
    // Attendance Analytics Endpoints
    // ============================================================================

    /// Get attendance summary for a user within a date range.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * `Ok(AttendanceSummary)` - Summary with clock-ins, clock-outs, duration stats
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_attendance_summary(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceSummary, Error> {
        AttendanceLogModule::get_attendance_summary(env, user_id, date_range)
    }

    /// Get time-based attendance records (daily, weekly, monthly).
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `period` - Time period for grouping (Daily, Weekly, Monthly, Custom)
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * `Ok(Vec<AttendanceLog>)` - Filtered attendance logs for the period
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_time_based_attendance(
        env: Env,
        user_id: Address,
        period: TimePeriod,
        date_range: DateRange,
    ) -> Result<Vec<AttendanceLog>, Error> {
        AttendanceLogModule::get_time_based_attendance(env, user_id, period, date_range)
    }

    /// Calculate attendance frequency for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(AttendanceFrequency)` - Frequency metrics including total, average daily
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn calculate_attendance_frequency(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceFrequency, Error> {
        AttendanceLogModule::calculate_attendance_frequency(env, user_id, date_range)
    }

    /// Get comprehensive user attendance statistics.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Optional date range (None for all-time stats)
    ///
    /// # Returns
    /// * `Ok(UserAttendanceStats)` - Comprehensive stats including total hours,
    ///   average attendance, session counts, and date ranges
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time (if range provided)
    /// * `NoAttendanceRecords` - No records found for user
    pub fn get_user_statistics(
        env: Env,
        user_id: Address,
        date_range: Option<DateRange>,
    ) -> Result<UserAttendanceStats, Error> {
        AttendanceLogModule::get_user_statistics(env, user_id, date_range)
    }

    /// Analyze peak attendance hours for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(Vec<PeakHourData>)` - Peak hour analysis showing attendance count
    ///   and percentage per hour
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn analyze_peak_hours(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<PeakHourData>, Error> {
        AttendanceLogModule::analyze_peak_hours(env, user_id, date_range)
    }

    /// Analyze attendance patterns by day of week.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(Vec<DayPattern>)` - Day patterns showing attendance distribution
    ///   across days of the week with counts and percentages
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn analyze_day_patterns(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<DayPattern>, Error> {
        AttendanceLogModule::analyze_day_patterns(env, user_id, date_range)
    }

    /// Calculate total hours from seconds.
    ///
    /// # Arguments
    /// * `total_seconds` - Total seconds to convert
    ///
    /// # Returns
    /// * Total hours (rounded down)
    pub fn calculate_total_hours(total_seconds: u64) -> u64 {
        AttendanceLogModule::calculate_total_hours(total_seconds)
    }

    /// Calculate average daily attendance for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(u64)` - Average daily attendance count
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_avg_daily_attendance(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<u64, Error> {
        AttendanceLogModule::calculate_average_daily_attendance(env, user_id, date_range)
    }

    // ============================================================================
    // Emergency Pause Endpoints
    // ============================================================================

    /// Immediately halts all token operations (issue, transfer, renew).
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `reason` - Human-readable reason for the pause
    /// * `auto_unpause_after` - Optional seconds until the contract auto-resumes.
    ///   Pass `None` for an indefinite pause that requires an explicit unpause call.
    /// * `time_lock_duration` - Optional minimum seconds before a manual unpause is
    ///   allowed. Use this during security incidents to prevent an attacker from
    ///   reversing the pause with a compromised admin key. Pass `None` for no lock.
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
        MembershipTokenContract::emergency_pause(
            env,
            admin,
            reason,
            auto_unpause_after,
            time_lock_duration,
        )
    }

    /// Lifts an active emergency pause and restores normal contract operation.
    ///
    /// The time lock (if any) must have elapsed before this call succeeds.
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    /// * `TimeLockNotExpired` - The mandatory lock window has not yet elapsed
    pub fn emergency_unpause(env: Env, admin: Address) -> Result<(), Error> {
        MembershipTokenContract::emergency_unpause(env, admin)
    }

    /// Returns `true` if the contract is currently globally paused.
    ///
    /// Respects time-based auto-unpause: returns `false` once
    /// `auto_unpause_at` has passed, even before an explicit unpause call.
    pub fn is_contract_paused(env: Env) -> bool {
        MembershipTokenContract::is_contract_paused(env)
    }

    /// Returns the full emergency pause state for inspection.
    pub fn get_emergency_pause_state(env: Env) -> EmergencyPauseState {
        MembershipTokenContract::get_emergency_pause_state(env)
    }

    /// Pauses all operations for a specific token.
    ///
    /// The per-token pause is independent of the global pause: either one is
    /// sufficient to block transfers and renewals on that token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `token_id` - The token to pause
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
        MembershipTokenContract::pause_token_operations(env, admin, token_id, reason)
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
        MembershipTokenContract::unpause_token_operations(env, admin, token_id)
    }

    /// Returns `true` if the specific token's operations are currently paused.
    pub fn is_token_paused(env: Env, token_id: BytesN<32>) -> bool {
        MembershipTokenContract::is_token_paused(env, token_id)
    }

    // ============================================================================
    // Token Staking Endpoints
    // ============================================================================

    /// Initialise or update the global staking configuration. Admin only.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `config` - New staking configuration
    ///
    /// # Errors
    /// * `AdminNotSet` - No admin has been configured
    /// * `Unauthorized` - Caller is not the admin
    /// * `InvalidPaymentAmount` - Penalty bps exceeds 100 %
    pub fn set_staking_config(
        env: Env,
        admin: Address,
        config: StakingConfig,
    ) -> Result<(), Error> {
        StakingModule::set_staking_config(env, admin, config)
    }

    /// Create a new staking tier. Admin only.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Admin address (must be authorized)
    /// * `tier` - Staking tier definition
    ///
    /// # Errors
    /// * `AdminNotSet` / `Unauthorized` - Auth failure
    /// * `TierAlreadyExists` - A tier with the same ID already exists
    /// * `InvalidPaymentAmount` - Invalid tier parameters
    pub fn create_staking_tier(env: Env, admin: Address, tier: StakingTier) -> Result<(), Error> {
        StakingModule::create_staking_tier(env, admin, tier)
    }

    /// Lock tokens into the specified staking tier.
    ///
    /// Requires the caller to have approved a token transfer from their wallet
    /// to this contract (via the staking token's `approve` method) before calling.
    ///
    /// If the caller already has an active stake in the same tier, the amounts
    /// are combined and the lock window resets.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `staker` - Staker address (must be authorized)
    /// * `tier_id` - Staking tier to lock into
    /// * `amount` - Number of tokens to lock
    ///
    /// # Errors
    /// * `SubscriptionNotActive` - Staking is disabled
    /// * `TierNotFound` - Tier ID does not exist
    /// * `InvalidPaymentAmount` - Amount below tier minimum
    /// * `Unauthorized` - Caller already has a stake in a different tier
    pub fn stake_tokens(
        env: Env,
        staker: Address,
        tier_id: String,
        amount: i128,
    ) -> Result<(), Error> {
        StakingModule::stake_tokens(env, staker, tier_id, amount)
    }

    /// Unlock tokens after the lock period has elapsed.
    ///
    /// Pending rewards are calculated and transferred together with the principal.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `staker` - Staker address (must be authorized)
    ///
    /// # Errors
    /// * `TokenNotFound` - No active stake found
    /// * `PauseTooEarly` - Lock period has not elapsed yet
    pub fn unstake_tokens(env: Env, staker: Address) -> Result<(), Error> {
        StakingModule::unstake_tokens(env, staker)
    }

    /// Emergency unstake: return tokens immediately with a penalty deducted.
    ///
    /// No staking rewards are paid. The penalty stays in the contract.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `staker` - Staker address (must be authorized)
    ///
    /// # Errors
    /// * `TokenNotFound` - No active stake found
    pub fn emergency_unstake(env: Env, staker: Address) -> Result<(), Error> {
        StakingModule::emergency_unstake(env, staker)
    }

    /// Get the active stake information for a staker.
    ///
    /// Returns `None` if the address has no active stake.
    pub fn get_stake_info(env: Env, staker: Address) -> Option<StakeInfo> {
        StakingModule::get_stake_info(env, staker)
    }

    /// Get all available staking tiers.
    pub fn get_staking_tiers(env: Env) -> Vec<StakingTier> {
        StakingModule::get_staking_tiers(env)
    }

    /// Get the global staking configuration.
    ///
    /// # Errors
    /// * `AdminNotSet` - Staking has not been configured yet
    pub fn get_staking_config(env: Env) -> Result<StakingConfig, Error> {
        StakingModule::get_staking_config(env)
    }

    // =========================================================================
    // Token Upgrade Mechanism
    // =========================================================================

    /// Initialise or update the global upgrade configuration. Admin only.
    ///
    /// Must be called before any upgrade functions can be used.
    ///
    /// # Arguments
    /// * `env`    - The contract environment
    /// * `admin`  - Admin address (must be authorized)
    /// * `config` - Upgrade configuration to apply
    ///
    /// # Errors
    /// * `AdminNotSet`    - No admin has been set
    /// * `Unauthorized`   - Caller is not the admin
    pub fn set_upgrade_config(
        env: Env,
        admin: Address,
        config: UpgradeConfig,
    ) -> Result<(), Error> {
        UpgradeModule::set_upgrade_config(env, admin, config)
    }

    /// Upgrade a single token to the next version.
    ///
    /// Captures a pre-upgrade snapshot for rollback, increments `current_version`,
    /// and optionally updates `expiry_date`, `tier_id`, and `status`.
    /// Emits a `TokenUpgraded` event on success.
    ///
    /// # Arguments
    /// * `env`             - The contract environment
    /// * `caller`          - Address triggering the upgrade (must be authorized)
    /// * `token_id`        - ID of the token to upgrade
    /// * `label`           - Optional human-readable version label (e.g. "v2-premium")
    /// * `new_expiry_date` - Optional new expiry timestamp
    /// * `new_tier_id`     - Optional new tier ID
    /// * `new_status`      - Optional new membership status
    ///
    /// # Returns
    /// The new version number on success.
    ///
    /// # Errors
    /// * `AdminNotSet`           - No admin has been set
    /// * `SubscriptionNotActive` - Upgrades are disabled
    /// * `TokenNotFound`         - Token does not exist
    /// * `Unauthorized`          - Caller is not authorised
    pub fn upgrade_token(
        env: Env,
        caller: Address,
        token_id: BytesN<32>,
        label: Option<String>,
        new_expiry_date: Option<u64>,
        new_tier_id: Option<String>,
        new_status: Option<MembershipStatus>,
    ) -> Result<u32, Error> {
        UpgradeModule::upgrade_token(
            env,
            caller,
            token_id,
            label,
            new_expiry_date,
            new_tier_id,
            new_status,
        )
    }

    /// Upgrade multiple tokens in a single call. Admin only.
    ///
    /// Individual token failures do NOT abort the entire batch; they are
    /// reported as `success: false` in the returned result list.
    ///
    /// # Arguments
    /// * `env`             - The contract environment
    /// * `admin`           - Admin address (must be authorized)
    /// * `token_ids`       - List of token IDs to upgrade
    /// * `label`           - Optional version label applied to all tokens
    /// * `new_expiry_date` - Optional new expiry timestamp applied to all tokens
    ///
    /// # Errors
    /// * `AdminNotSet`           - No admin has been set
    /// * `Unauthorized`          - Caller is not the admin
    /// * `SubscriptionNotActive` - Upgrades are disabled
    pub fn batch_upgrade_tokens(
        env: Env,
        admin: Address,
        token_ids: Vec<BytesN<32>>,
        label: Option<String>,
        new_expiry_date: Option<u64>,
    ) -> Result<Vec<BatchUpgradeResult>, Error> {
        UpgradeModule::batch_upgrade_tokens(env, admin, token_ids, label, new_expiry_date)
    }

    /// Get the current version number of a token.
    ///
    /// # Arguments
    /// * `env`      - The contract environment
    /// * `token_id` - ID of the token to query
    ///
    /// # Errors
    /// * `TokenNotFound` - Token does not exist
    pub fn get_token_version(env: Env, token_id: BytesN<32>) -> Result<u32, Error> {
        UpgradeModule::get_token_version(env, token_id)
    }

    /// Get the full upgrade history for a token.
    ///
    /// Returns an empty list if the token has never been upgraded.
    ///
    /// # Arguments
    /// * `env`      - The contract environment
    /// * `token_id` - ID of the token to query
    pub fn get_upgrade_history(env: Env, token_id: BytesN<32>) -> Vec<UpgradeRecord> {
        UpgradeModule::get_upgrade_history(env, token_id)
    }

    /// Roll back a token to a specific previous version. Admin only.
    ///
    /// The token's version number continues to increment (not reset) so the
    /// audit trail is preserved. The state (expiry, tier, status) from the
    /// target snapshot is restored.
    ///
    /// # Arguments
    /// * `env`            - The contract environment
    /// * `admin`          - Admin address (must be authorized)
    /// * `token_id`       - ID of the token to roll back
    /// * `target_version` - The version number to restore state from
    ///
    /// # Returns
    /// The new (incremented) version number after rollback.
    ///
    /// # Errors
    /// * `AdminNotSet`         - No admin has been set
    /// * `Unauthorized`        - Caller is not the admin
    /// * `TokenNotFound`       - Token does not exist
    /// * `MetadataNotFound`    - No snapshot for `target_version`
    /// * `PauseCountExceeded`  - Maximum rollback count reached
    pub fn rollback_token_upgrade(
        env: Env,
        admin: Address,
        token_id: BytesN<32>,
        target_version: u32,
    ) -> Result<u32, Error> {
        UpgradeModule::rollback_token_upgrade(env, admin, token_id, target_version)
    }

    /// Get the global upgrade configuration.
    ///
    /// # Errors
    /// * `AdminNotSet` - Upgrade system has not been configured yet
    pub fn get_upgrade_config(env: Env) -> Result<UpgradeConfig, Error> {
        UpgradeModule::get_upgrade_config(env)
    }
}

mod test;
