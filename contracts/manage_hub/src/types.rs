use soroban_sdk::{contracttype, Address, BytesN, String, Vec};

// Re-export types from common_types for consistency
pub use common_types::MembershipStatus;
pub use common_types::{
    SubscriptionTier, TierChangeRequest, TierChangeStatus, TierChangeType, TierFeature, TierLevel,
    TierPromotion,
};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum AttendanceAction {
    ClockIn,
    ClockOut,
}

/// Billing cycle for subscriptions.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum BillingCycle {
    /// Monthly billing
    Monthly,
    /// Annual billing (usually discounted)
    Annual,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Subscription {
    pub id: String,
    pub user: Address,
    pub payment_token: Address,
    pub amount: i128,
    pub status: MembershipStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub tier_id: String,
    pub billing_cycle: BillingCycle,
    pub paused_at: Option<u64>,
    pub last_resumed_at: u64,
    pub pause_count: u32,
    pub total_paused_duration: u64,
    pub pause_history: Vec<PauseHistoryEntry>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PauseAction {
    Pause,
    Resume,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseHistoryEntry {
    pub action: PauseAction,
    pub timestamp: u64,
    pub actor: Address,
    pub is_admin: bool,
    pub reason: Option<String>,
    pub paused_duration: Option<u64>,
    pub applied_extension: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseConfig {
    pub max_pause_duration: u64,
    pub max_pause_count: u32,
    pub min_active_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseStats {
    pub pause_count: u32,
    pub total_paused_duration: u64,
    pub is_paused: bool,
    pub paused_at: Option<u64>,
    /// The tier ID this subscription belongs to
    pub tier_id: String,
    /// Billing cycle (monthly or annual)
    pub billing_cycle: BillingCycle,
}

/// User subscription with tier details for queries.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UserSubscriptionInfo {
    /// The subscription details
    pub subscription: Subscription,
    /// The tier name
    pub tier_name: String,
    /// The tier level
    pub tier_level: TierLevel,
    /// Features available to this user
    pub features: soroban_sdk::Vec<TierFeature>,
    /// Days remaining in subscription
    pub days_remaining: u64,
    /// Whether subscription is expired
    pub is_expired: bool,
}

/// Analytics data for tier usage tracking.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TierAnalytics {
    /// Tier ID
    pub tier_id: String,
    /// Total active subscribers
    pub active_subscribers: u32,
    /// Total revenue generated
    pub total_revenue: i128,
    /// Number of upgrades to this tier
    pub upgrades_count: u32,
    /// Number of downgrades from this tier
    pub downgrades_count: u32,
    /// Churn rate (cancellations / total * 100)
    pub churn_rate: u32,
    /// Last updated timestamp
    pub updated_at: u64,
}

/// Parameters for creating a new subscription tier.
/// Used to reduce function argument count.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreateTierParams {
    /// Unique tier identifier
    pub id: String,
    /// Human-readable tier name
    pub name: String,
    /// Tier level (Free, Basic, Pro, Enterprise)
    pub level: TierLevel,
    /// Monthly price in smallest token unit
    pub price: i128,
    /// Annual price (usually discounted)
    pub annual_price: i128,
    /// List of features enabled for this tier
    pub features: soroban_sdk::Vec<TierFeature>,
    /// Maximum users allowed (0 = unlimited)
    pub max_users: u32,
    /// Maximum storage in bytes (0 = unlimited)
    pub max_storage: u64,
}

/// Parameters for updating a subscription tier.
/// All fields except id are optional - only provided values will be updated.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UpdateTierParams {
    /// Tier ID to update
    pub id: String,
    /// New tier name (optional)
    pub name: Option<String>,
    /// New monthly price (optional)
    pub price: Option<i128>,
    /// New annual price (optional)
    pub annual_price: Option<i128>,
    /// New features list (optional)
    pub features: Option<soroban_sdk::Vec<TierFeature>>,
    /// New max users limit (optional)
    pub max_users: Option<u32>,
    /// New max storage limit (optional)
    pub max_storage: Option<u64>,
    /// Whether tier is active (optional)
    pub is_active: Option<bool>,
}

/// Parameters for creating a promotion.
/// Used to reduce function argument count.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreatePromotionParams {
    /// Unique promotion identifier
    pub promo_id: String,
    /// ID of the tier this promotion applies to
    pub tier_id: String,
    /// Discount percentage (0-100)
    pub discount_percent: u32,
    /// Fixed promotional price (0 means use discount_percent)
    pub promo_price: i128,
    /// Promotion start timestamp
    pub start_date: u64,
    /// Promotion end timestamp
    pub end_date: u64,
    /// Promotion code users must enter
    pub promo_code: String,
    /// Maximum number of redemptions (0 = unlimited)
    pub max_redemptions: u32,
}

// Attendance analytics summary structures
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AttendanceSummary {
    pub user_id: Address,
    pub date_range_start: u64,
    pub date_range_end: u64,
    pub total_clock_ins: u32,
    pub total_clock_outs: u32,
    pub total_duration: u64,
    pub average_session_duration: u64,
    pub total_sessions: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AttendanceReport {
    pub report_id: String,
    pub generated_at: u64,
    pub date_range_start: u64,
    pub date_range_end: u64,
    pub total_users: u32,
    pub total_attendances: u32,
    pub user_summaries: Vec<AttendanceSummary>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct SessionPair {
    pub clock_in_time: u64,
    pub clock_out_time: u64,
    pub duration: u64,
}

// ============================================================================
// Token Renewal Types
// ============================================================================

/// Configuration for token renewal system.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RenewalConfig {
    /// Grace period duration in seconds (default 7 days)
    pub grace_period_duration: u64,
    /// Auto-renewal notice period in seconds (default 1 day before expiry)
    pub auto_renewal_notice_days: u64,
    /// Whether renewals are currently enabled
    pub renewals_enabled: bool,
}

/// Trigger reason for token renewal.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum RenewalTrigger {
    /// Manual renewal by user or admin
    Manual,
    /// Automatic renewal triggered by system
    AutoRenewal,
    /// Renewal during grace period
    GracePeriod,
}

/// Record of a token renewal attempt.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RenewalHistory {
    /// Timestamp of renewal attempt
    pub timestamp: u64,
    /// Tier ID used for pricing
    pub tier_id: String,
    /// Amount paid for renewal
    pub amount: i128,
    /// Payment token address
    pub payment_token: Address,
    /// Whether renewal was successful
    pub success: bool,
    /// What triggered the renewal
    pub trigger: RenewalTrigger,
    /// Old expiry date before renewal
    pub old_expiry_date: u64,
    /// New expiry date after renewal (if successful)
    pub new_expiry_date: Option<u64>,
    /// Error message if renewal failed
    pub error: Option<String>,
}

/// Auto-renewal settings for a user's token.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AutoRenewalSettings {
    /// Whether auto-renewal is enabled
    pub enabled: bool,
    /// Token ID to auto-renew
    pub token_id: BytesN<32>,
    /// Payment token to use for auto-renewal
    pub payment_token: Address,
    /// Timestamp when settings were last updated
    pub updated_at: u64,
}

// ============================================================================
// Token Allowance and Delegation Types
// ============================================================================

/// Delegated transfer allowance for a specific token owner/spender pair.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenAllowance {
    /// Token ID this allowance applies to
    pub token_id: BytesN<32>,
    /// Current token owner who granted the allowance
    pub owner: Address,
    /// Spender address authorized for delegated transfers
    pub spender: Address,
    /// Remaining allowance amount available for consumption
    pub amount: i128,
    /// Optional expiration timestamp for this allowance
    pub expires_at: Option<u64>,
    /// Last update timestamp (create/update/consume)
    pub updated_at: u64,
}

// ============================================================================
// Emergency Pause Types
// ============================================================================

/// Global emergency pause state for the entire contract.
///
/// Stored in instance storage so it is immediately visible to all operations.
/// Supports both admin-initiated manual unpauses and time-based auto-unpauses.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct EmergencyPauseState {
    /// Whether the contract is currently paused
    pub is_paused: bool,
    /// Ledger timestamp when the pause was initiated
    pub paused_at: Option<u64>,
    /// Address that initiated the pause
    pub paused_by: Option<Address>,
    /// Human-readable reason for the pause
    pub reason: Option<String>,
    /// Ledger timestamp after which the contract auto-resumes without admin action.
    /// None means the pause has no automatic expiry.
    pub auto_unpause_at: Option<u64>,
    /// Minimum ledger timestamp before an admin can manually unpause.
    /// This creates an immutable window after an emergency pause during which
    /// even a compromised admin key cannot reverse the pause.
    /// None means no time lock is applied.
    pub time_lock_until: Option<u64>,
    /// Cumulative number of times the contract has been paused
    pub pause_count: u32,
}

/// Per-token pause state, allowing fine-grained suspension of individual tokens.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenPauseState {
    /// Whether this token's operations are currently paused
    pub is_paused: bool,
    /// Ledger timestamp when the pause was initiated
    pub paused_at: u64,
    /// Address that initiated the pause
    pub paused_by: Address,
    /// Human-readable reason for the pause
    pub reason: Option<String>,
}

// ============================================================================
// Token Staking Types
// ============================================================================

/// Staking tier defining lock duration and reward multiplier.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingTier {
    /// Unique tier identifier (e.g. "bronze", "silver", "gold")
    pub id: String,
    /// Human-readable tier name
    pub name: String,
    /// Minimum stake amount required for this tier
    pub min_stake_amount: i128,
    /// Lock duration in seconds
    pub lock_duration: u64,
    /// Reward multiplier in basis points (10_000 = 1x, 15_000 = 1.5x)
    pub reward_multiplier_bps: u32,
    /// Annual base reward rate in basis points (e.g. 500 = 5%)
    pub base_rate_bps: u32,
}

/// Represents an active stake held by a user.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakeInfo {
    /// Staker address
    pub staker: Address,
    /// Amount of tokens locked
    pub amount: i128,
    /// Staking tier ID
    pub tier_id: String,
    /// Timestamp when tokens were locked
    pub staked_at: u64,
    /// Earliest timestamp at which tokens can be unlocked without penalty
    pub unlock_at: u64,
    /// Accumulated rewards already claimed
    pub claimed_rewards: i128,
    /// Whether this stake was emergency-unstaked
    pub emergency_unstaked: bool,
}

/// Global staking configuration set by admin.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingConfig {
    /// Whether staking is currently enabled
    pub staking_enabled: bool,
    /// Penalty in basis points applied on emergency unstake (e.g. 1000 = 10%)
    pub emergency_unstake_penalty_bps: u32,
    /// Token address used for staking (must be a Soroban token)
    pub staking_token: Address,
    /// Reward pool address that distributes reward tokens
    pub reward_pool: Address,
}

// ============================================================================
// Token Upgrade Types
// ============================================================================

/// Configuration for the token upgrade system.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UpgradeConfig {
    /// Whether token upgrades are currently enabled
    pub upgrades_enabled: bool,
    /// Whether only the admin can trigger upgrades (false = token owner can also upgrade)
    pub admin_only: bool,
    /// Maximum number of rollbacks allowed per token (0 = unlimited)
    pub max_rollbacks: u32,
}

/// A snapshot of a token's version state, stored for rollback purposes.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenVersionSnapshot {
    /// The version number this snapshot represents
    pub version: u32,
    /// Token expiry date at this version
    pub expiry_date: u64,
    /// Token status at this version
    pub status: MembershipStatus,
    /// Tier ID at this version
    pub tier_id: Option<String>,
    /// Timestamp when this snapshot was taken
    pub captured_at: u64,
    /// Human-readable label for this version (e.g. "v1", "v2-enhanced")
    pub label: Option<String>,
}

/// A single entry in a token's upgrade history.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UpgradeRecord {
    /// Token ID that was upgraded
    pub token_id: BytesN<32>,
    /// Version before the upgrade
    pub from_version: u32,
    /// Version after the upgrade
    pub to_version: u32,
    /// Address that triggered the upgrade
    pub upgraded_by: Address,
    /// Timestamp of the upgrade
    pub upgraded_at: u64,
    /// Human-readable label for the new version
    pub label: Option<String>,
    /// Whether this was a rollback operation
    pub is_rollback: bool,
}

/// Result for a single token in a batch upgrade operation.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BatchUpgradeResult {
    /// Token ID that was processed
    pub token_id: BytesN<32>,
    /// Whether the upgrade succeeded
    pub success: bool,
    /// New version number (if success)
    pub new_version: Option<u32>,
}

// ============================================================================
// Token Fractionalization Types
// ============================================================================

/// Fractionalization configuration for a token.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct FractionalTokenInfo {
    /// Original membership token ID
    pub token_id: BytesN<32>,
    /// Total shares minted for this token
    pub total_shares: i128,
    /// Minimum transferable fraction size
    pub min_fraction_size: i128,
    /// Fractionalization timestamp
    pub created_at: u64,
    /// Address that performed fractionalization
    pub created_by: Address,
}

/// Holder-level fractional ownership details.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct FractionHolder {
    /// Holder address
    pub holder: Address,
    /// Shares owned by this holder
    pub shares: i128,
    /// Voting rights in basis points (10_000 = 100%)
    pub voting_power_bps: u32,
}

/// Dividend distribution summary for fractional shares.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct DividendDistribution {
    /// Token ID distributed against
    pub token_id: BytesN<32>,
    /// Total reward amount distributed
    pub total_amount: i128,
    /// Number of holders receiving distribution
    pub recipients: u32,
    /// Distribution timestamp
    pub distributed_at: u64,
}
