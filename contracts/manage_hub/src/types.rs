use soroban_sdk::{contracttype, Address, String};

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
