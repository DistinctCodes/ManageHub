//! Common types used across ManageHub contracts.
//!
//! This module provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts, including subscription management,
//! attendance tracking, and user role definitions.

use soroban_sdk::{contracttype, Address, Map, String, Vec};

// ============================================================================
// Metadata Types for Token Metadata System
// ============================================================================

/// Maximum length for metadata description text
pub const MAX_DESCRIPTION_LENGTH: u32 = 500;

/// Maximum number of custom attributes per token
pub const MAX_ATTRIBUTES_COUNT: u32 = 20;

/// Maximum length for attribute keys
pub const MAX_ATTRIBUTE_KEY_LENGTH: u32 = 50;

/// Maximum length for text attribute values
pub const MAX_TEXT_VALUE_LENGTH: u32 = 200;

/// Represents different types of metadata values that can be stored.
///
/// This enum provides flexibility in storing various data types as metadata
/// attributes, allowing for extensible token properties.
///
/// # Variants
/// * `Text` - String/text value (max 200 chars)
/// * `Number` - Numeric value (i128)
/// * `Boolean` - Boolean true/false value
/// * `Timestamp` - Unix timestamp value (u64)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MetadataValue {
    /// Text/string value
    Text(String),
    /// Numeric value
    Number(i128),
    /// Boolean value
    Boolean(bool),
    /// Timestamp value
    Timestamp(u64),
}

/// Complete metadata structure for membership tokens.
///
/// Stores all metadata associated with a token including description,
/// custom attributes, version information, and update tracking.
///
/// # Fields
/// * `description` - Human-readable description of the token
/// * `attributes` - Map of custom key-value attributes
/// * `version` - Current version number (increments on updates)
/// * `last_updated` - Timestamp of last metadata update
/// * `updated_by` - Address of user who last updated metadata
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenMetadata {
    /// Token description
    pub description: String,
    /// Custom attributes
    pub attributes: Map<String, MetadataValue>,
    /// Version number
    pub version: u32,
    /// Last update timestamp
    pub last_updated: u64,
    /// Address of last updater
    pub updated_by: Address,
}

/// Metadata update history entry for versioning and audit trail.
///
/// Tracks changes made to token metadata over time, enabling
/// version history and rollback capabilities.
///
/// # Fields
/// * `version` - Version number of this update
/// * `timestamp` - When the update occurred
/// * `updated_by` - Who made the update
/// * `description` - Description at this version
/// * `changes` - Attributes changed in this update
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataUpdate {
    /// Version number
    pub version: u32,
    /// Update timestamp
    pub timestamp: u64,
    /// Updater address
    pub updated_by: Address,
    /// Description at this version
    pub description: String,
    /// Changed attributes
    pub changes: Map<String, MetadataValue>,
}

// ============================================================================
// Existing Types
// ============================================================================

/// Subscription plan types available in ManageHub.
///
/// Defines the different billing frequencies for subscriptions.
///
/// # Variants
/// * `Daily` - Daily subscription billing
/// * `Monthly` - Monthly subscription billing
/// * `PayPerUse` - Pay-as-you-go billing model
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SubscriptionPlan {
    /// Daily subscription plan
    Daily,
    /// Monthly subscription plan
    Monthly,
    /// Pay-per-use plan
    PayPerUse,
}

/// Attendance tracking actions.
///
/// Represents the possible attendance actions that can be recorded
/// in the system.
///
/// # Variants
/// * `ClockIn` - User clocks in (arrival)
/// * `ClockOut` - User clocks out (departure)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AttendanceAction {
    /// Clock in action (arrival)
    ClockIn,
    /// Clock out action (departure)
    ClockOut,
}

/// User role types in the ManageHub system.
///
/// Defines the different permission levels and user types
/// within the platform.
///
/// # Variants
/// * `Member` - Regular member with standard access
/// * `Staff` - Staff member with elevated privileges
/// * `Admin` - Administrator with full access
/// * `Visitor` - Temporary visitor with limited access
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum UserRole {
    /// Regular member
    Member,
    /// Staff member with elevated privileges
    Staff,
    /// Administrator with full access
    Admin,
    /// Temporary visitor with limited access
    Visitor,
}

/// Membership status types.
///
/// Tracks the current state of a user's membership.
/// Includes all status variants used across ManageHub contracts.
///
/// # Variants
/// * `Active` - Membership is currently active
/// * `Paused` - Membership is temporarily paused
/// * `GracePeriod` - Membership expired but within grace period (usable with restrictions)
/// * `Expired` - Membership has expired
/// * `Revoked` - Membership has been revoked
/// * `Inactive` - Membership is inactive
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MembershipStatus {
    /// Active membership
    Active,
    /// Temporarily paused membership
    Paused,
    /// Expired but within grace period (restricted access)
    GracePeriod,
    /// Expired membership
    Expired,
    /// Revoked membership
    Revoked,
    /// Inactive membership
    Inactive,
}

// ============================================================================
// Attendance Analytics Types
// ============================================================================

/// Time period options for analytics queries.
///
/// Used to group and filter attendance data by specific time ranges.
///
/// # Variants
/// * `Daily` - Daily aggregation
/// * `Weekly` - Weekly aggregation
/// * `Monthly` - Monthly aggregation
/// * `Custom` - Custom date range
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TimePeriod {
    /// Daily time period
    Daily,
    /// Weekly time period
    Weekly,
    /// Monthly time period
    Monthly,
    /// Custom date range
    Custom,
}

/// Date range structure for filtering attendance records.
///
/// Specifies a time window for querying attendance data.
///
/// # Fields
/// * `start_time` - Start timestamp (inclusive)
/// * `end_time` - End timestamp (inclusive)
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DateRange {
    /// Start timestamp
    pub start_time: u64,
    /// End timestamp
    pub end_time: u64,
}

/// Aggregated attendance statistics for a user.
///
/// Contains comprehensive attendance metrics including duration,
/// frequency, and pattern analysis.
///
/// # Fields
/// * `user_id` - User address
/// * `total_sessions` - Total number of attendance sessions
/// * `total_duration` - Total time spent (seconds)
/// * `average_duration` - Average session duration (seconds)
/// * `first_clock_in` - Timestamp of first attendance
/// * `last_clock_out` - Timestamp of last departure
/// * `total_days_present` - Number of unique days with attendance
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserAttendanceStats {
    /// User address
    pub user_id: Address,
    /// Total attendance sessions
    pub total_sessions: u32,
    /// Total duration in seconds
    pub total_duration: u64,
    /// Average session duration in seconds
    pub average_duration: u64,
    /// First clock-in timestamp
    pub first_clock_in: u64,
    /// Last clock-out timestamp
    pub last_clock_out: u64,
    /// Total unique days present
    pub total_days_present: u32,
}

/// Attendance frequency metrics for a specific time period.
///
/// Tracks attendance frequency patterns and distribution.
///
/// # Fields
/// * `period` - Time period type
/// * `period_start` - Period start timestamp
/// * `period_end` - Period end timestamp
/// * `total_attendances` - Total attendance records in period
/// * `unique_users` - Number of unique users
/// * `average_daily_attendance` - Average attendances per day
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AttendanceFrequency {
    /// Time period
    pub period: TimePeriod,
    /// Period start timestamp
    pub period_start: u64,
    /// Period end timestamp
    pub period_end: u64,
    /// Total attendance records
    pub total_attendances: u32,
    /// Unique users count
    pub unique_users: u32,
    /// Average daily attendance
    pub average_daily_attendance: u32,
}

/// Peak hour analysis data.
///
/// Identifies hours and days with highest attendance activity.
///
/// # Fields
/// * `hour` - Hour of day (0-23)
/// * `attendance_count` - Number of attendances in this hour
/// * `percentage` - Percentage of total attendances
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PeakHourData {
    /// Hour of day (0-23)
    pub hour: u32,
    /// Attendance count
    pub attendance_count: u32,
    /// Percentage of total
    pub percentage: u32,
}

/// Daily attendance pattern data.
///
/// Tracks attendance distribution across days of the week.
///
/// # Fields
/// * `day_of_week` - Day (0=Sunday, 6=Saturday)
/// * `attendance_count` - Number of attendances on this day
/// * `percentage` - Percentage of total attendances
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DayPattern {
    /// Day of week (0=Sunday, 6=Saturday)
    pub day_of_week: u32,
    /// Attendance count
    pub attendance_count: u32,
    /// Percentage of total
    pub percentage: u32,
}

// ============================================================================
// Subscription Tier Types
// ============================================================================

/// Subscription tier level representing different access levels.
///
/// Defines the hierarchy of subscription tiers from free to enterprise.
///
/// # Variants
/// * `Free` - Basic free tier with limited features
/// * `Basic` - Entry-level paid tier
/// * `Pro` - Professional tier with advanced features
/// * `Enterprise` - Full-featured enterprise tier
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TierLevel {
    /// Free tier with limited features
    Free,
    /// Basic paid tier
    Basic,
    /// Professional tier
    Pro,
    /// Enterprise tier with all features
    Enterprise,
}

/// Feature flags for subscription tiers.
///
/// Defines the available features that can be enabled/disabled per tier.
///
/// # Variants
/// * `BasicAccess` - Basic platform access
/// * `PrioritySupport` - Priority customer support
/// * `AdvancedAnalytics` - Advanced analytics and reporting
/// * `CustomBranding` - Custom branding options
/// * `ApiAccess` - API access for integrations
/// * `UnlimitedStorage` - Unlimited data storage
/// * `TeamManagement` - Team/organization management
/// * `WhiteLabel` - White-label capabilities
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TierFeature {
    /// Basic platform access
    BasicAccess,
    /// Priority customer support
    PrioritySupport,
    /// Advanced analytics and reporting
    AdvancedAnalytics,
    /// Custom branding options
    CustomBranding,
    /// API access for integrations
    ApiAccess,
    /// Unlimited data storage
    UnlimitedStorage,
    /// Team/organization management
    TeamManagement,
    /// White-label capabilities
    WhiteLabel,
}

/// Subscription tier definition with pricing and features.
///
/// Defines a complete subscription tier including its level, pricing,
/// features, and usage limits.
///
/// # Fields
/// * `id` - Unique tier identifier
/// * `name` - Human-readable tier name
/// * `level` - Tier level (Free, Basic, Pro, Enterprise)
/// * `price` - Monthly price in smallest token unit
/// * `annual_price` - Annual price (discounted) in smallest token unit
/// * `features` - List of enabled features for this tier
/// * `max_users` - Maximum number of users allowed (0 = unlimited)
/// * `max_storage` - Maximum storage in bytes (0 = unlimited)
/// * `is_active` - Whether this tier is currently available for purchase
/// * `created_at` - Timestamp when tier was created
/// * `updated_at` - Timestamp of last update
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionTier {
    /// Unique tier identifier
    pub id: String,
    /// Human-readable tier name
    pub name: String,
    /// Tier level
    pub level: TierLevel,
    /// Monthly price in smallest token unit
    pub price: i128,
    /// Annual price (discounted) in smallest token unit
    pub annual_price: i128,
    /// List of enabled features
    pub features: Vec<TierFeature>,
    /// Maximum number of users (0 = unlimited)
    pub max_users: u32,
    /// Maximum storage in bytes (0 = unlimited)
    pub max_storage: u64,
    /// Whether tier is active for purchase
    pub is_active: bool,
    /// Creation timestamp
    pub created_at: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

/// Promotional pricing for subscription tiers.
///
/// Allows temporary discounts or special pricing for tiers.
///
/// # Fields
/// * `tier_id` - The tier this promotion applies to
/// * `discount_percent` - Discount percentage (0-100)
/// * `promo_price` - Fixed promotional price (if set, overrides discount)
/// * `start_date` - Promotion start timestamp
/// * `end_date` - Promotion end timestamp
/// * `promo_code` - Optional promotion code required
/// * `max_redemptions` - Maximum number of times this can be used (0 = unlimited)
/// * `current_redemptions` - Current redemption count
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TierPromotion {
    /// The tier this promotion applies to
    pub tier_id: String,
    /// Discount percentage (0-100)
    pub discount_percent: u32,
    /// Fixed promotional price (0 means use discount_percent instead)
    pub promo_price: i128,
    /// Promotion start timestamp
    pub start_date: u64,
    /// Promotion end timestamp
    pub end_date: u64,
    /// Optional promotion code
    pub promo_code: String,
    /// Maximum redemptions (0 = unlimited)
    pub max_redemptions: u32,
    /// Current redemption count
    pub current_redemptions: u32,
}

/// Tier change request for upgrades/downgrades.
///
/// Tracks pending or completed tier changes with proration details.
///
/// # Fields
/// * `user` - User requesting the change
/// * `from_tier` - Current tier ID
/// * `to_tier` - Target tier ID
/// * `change_type` - Type of change (upgrade/downgrade)
/// * `prorated_amount` - Prorated credit/charge amount
/// * `effective_date` - When the change takes effect
/// * `status` - Current status of the change request
/// * `created_at` - When the request was created
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TierChangeRequest {
    /// User requesting the change
    pub user: Address,
    /// Current tier ID
    pub from_tier: String,
    /// Target tier ID
    pub to_tier: String,
    /// Type of change
    pub change_type: TierChangeType,
    /// Prorated credit/charge amount
    pub prorated_amount: i128,
    /// When the change takes effect
    pub effective_date: u64,
    /// Status of the change request
    pub status: TierChangeStatus,
    /// Request creation timestamp
    pub created_at: u64,
}

/// Type of tier change.
///
/// # Variants
/// * `Upgrade` - Moving to a higher tier
/// * `Downgrade` - Moving to a lower tier
/// * `Lateral` - Same level tier switch
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TierChangeType {
    /// Upgrading to a higher tier
    Upgrade,
    /// Downgrading to a lower tier
    Downgrade,
    /// Lateral move to same-level tier
    Lateral,
}

/// Status of a tier change request.
///
/// # Variants
/// * `Pending` - Awaiting processing or payment
/// * `Approved` - Approved and awaiting effective date
/// * `Completed` - Change has been applied
/// * `Cancelled` - Change was cancelled
/// * `Rejected` - Change was rejected
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TierChangeStatus {
    /// Awaiting processing
    Pending,
    /// Approved, awaiting effective date
    Approved,
    /// Change completed
    Completed,
    /// Change cancelled
    Cancelled,
    /// Change rejected
    Rejected,
}

// ============================================================================
// Metadata Validation Functions
// ============================================================================

/// Validates metadata to ensure it meets size and format requirements.
///
/// # Arguments
/// * `metadata` - The metadata to validate
///
/// # Returns
/// * `Ok(())` if validation passes
/// * `Err(&str)` with error message if validation fails
///
/// # Validation Rules
/// - Description length must not exceed MAX_DESCRIPTION_LENGTH
/// - Attributes count must not exceed MAX_ATTRIBUTES_COUNT
/// - Each attribute key must not exceed MAX_ATTRIBUTE_KEY_LENGTH
/// - Text values must not exceed MAX_TEXT_VALUE_LENGTH
pub fn validate_metadata(metadata: &TokenMetadata) -> Result<(), &'static str> {
    // Validate description length
    if metadata.description.len() > MAX_DESCRIPTION_LENGTH {
        return Err("Description exceeds maximum length");
    }

    // Validate attributes count
    if metadata.attributes.len() > MAX_ATTRIBUTES_COUNT {
        return Err("Too many attributes");
    }

    // Validate each attribute
    for key in metadata.attributes.keys() {
        // Validate key length
        if key.len() > MAX_ATTRIBUTE_KEY_LENGTH {
            return Err("Attribute key exceeds maximum length");
        }

        // Validate value based on type
        if let Some(MetadataValue::Text(text)) = metadata.attributes.get(key.clone()) {
            if text.len() > MAX_TEXT_VALUE_LENGTH {
                return Err("Text value exceeds maximum length");
            }
        }
    }

    Ok(())
}

/// Validates a single attribute key-value pair.
///
/// # Arguments
/// * `key` - The attribute key
/// * `value` - The attribute value
///
/// # Returns
/// * `Ok(())` if validation passes
/// * `Err(&str)` with error message if validation fails
pub fn validate_attribute(key: &String, value: &MetadataValue) -> Result<(), &'static str> {
    // Validate key length
    if key.len() > MAX_ATTRIBUTE_KEY_LENGTH {
        return Err("Attribute key exceeds maximum length");
    }

    // Validate value based on type
    if let MetadataValue::Text(text) = value {
        if text.len() > MAX_TEXT_VALUE_LENGTH {
            return Err("Text value exceeds maximum length");
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subscription_plan_variants() {
        let daily = SubscriptionPlan::Daily;
        let monthly = SubscriptionPlan::Monthly;
        let pay_per_use = SubscriptionPlan::PayPerUse;

        assert_eq!(daily, SubscriptionPlan::Daily);
        assert_eq!(monthly, SubscriptionPlan::Monthly);
        assert_eq!(pay_per_use, SubscriptionPlan::PayPerUse);
    }

    #[test]
    fn test_attendance_action_variants() {
        let clock_in = AttendanceAction::ClockIn;
        let clock_out = AttendanceAction::ClockOut;

        assert_eq!(clock_in, AttendanceAction::ClockIn);
        assert_eq!(clock_out, AttendanceAction::ClockOut);
    }

    #[test]
    fn test_user_role_variants() {
        let member = UserRole::Member;
        let staff = UserRole::Staff;
        let admin = UserRole::Admin;
        let visitor = UserRole::Visitor;

        assert_eq!(member, UserRole::Member);
        assert_eq!(staff, UserRole::Staff);
        assert_eq!(admin, UserRole::Admin);
        assert_eq!(visitor, UserRole::Visitor);
    }

    #[test]
    fn test_membership_status_variants() {
        let active = MembershipStatus::Active;
        let paused = MembershipStatus::Paused;
        let expired = MembershipStatus::Expired;
        let revoked = MembershipStatus::Revoked;
        let inactive = MembershipStatus::Inactive;

        assert_eq!(active, MembershipStatus::Active);
        assert_eq!(paused, MembershipStatus::Paused);
        assert_eq!(expired, MembershipStatus::Expired);
        assert_eq!(revoked, MembershipStatus::Revoked);
        assert_eq!(inactive, MembershipStatus::Inactive);
    }

    #[test]
    fn test_clone_derive() {
        let plan = SubscriptionPlan::Monthly;
        let cloned = plan.clone();
        assert_eq!(plan, cloned);
    }

    #[test]
    fn test_tier_level_variants() {
        let free = TierLevel::Free;
        let basic = TierLevel::Basic;
        let pro = TierLevel::Pro;
        let enterprise = TierLevel::Enterprise;

        assert_eq!(free, TierLevel::Free);
        assert_eq!(basic, TierLevel::Basic);
        assert_eq!(pro, TierLevel::Pro);
        assert_eq!(enterprise, TierLevel::Enterprise);
    }

    #[test]
    fn test_tier_feature_variants() {
        let basic_access = TierFeature::BasicAccess;
        let priority_support = TierFeature::PrioritySupport;
        let advanced_analytics = TierFeature::AdvancedAnalytics;
        let api_access = TierFeature::ApiAccess;

        assert_eq!(basic_access, TierFeature::BasicAccess);
        assert_eq!(priority_support, TierFeature::PrioritySupport);
        assert_eq!(advanced_analytics, TierFeature::AdvancedAnalytics);
        assert_eq!(api_access, TierFeature::ApiAccess);
    }

    #[test]
    fn test_tier_change_type_variants() {
        let upgrade = TierChangeType::Upgrade;
        let downgrade = TierChangeType::Downgrade;
        let lateral = TierChangeType::Lateral;

        assert_eq!(upgrade, TierChangeType::Upgrade);
        assert_eq!(downgrade, TierChangeType::Downgrade);
        assert_eq!(lateral, TierChangeType::Lateral);
    }

    #[test]
    fn test_tier_change_status_variants() {
        let pending = TierChangeStatus::Pending;
        let approved = TierChangeStatus::Approved;
        let completed = TierChangeStatus::Completed;
        let cancelled = TierChangeStatus::Cancelled;
        let rejected = TierChangeStatus::Rejected;

        assert_eq!(pending, TierChangeStatus::Pending);
        assert_eq!(approved, TierChangeStatus::Approved);
        assert_eq!(completed, TierChangeStatus::Completed);
        assert_eq!(cancelled, TierChangeStatus::Cancelled);
        assert_eq!(rejected, TierChangeStatus::Rejected);
    }
}
