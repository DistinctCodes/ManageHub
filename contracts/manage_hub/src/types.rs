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
