//! Common types used across ManageHub contracts.
//!
//! This module provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts, including subscription management,
//! attendance tracking, and user role definitions.

use soroban_sdk::{contracttype, Address, Map, String};

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
/// * `Expired` - Membership has expired
/// * `Revoked` - Membership has been revoked
/// * `Inactive` - Membership is inactive
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MembershipStatus {
    /// Active membership
    Active,
    Paused,
    /// Expired membership
    Expired,
    /// Revoked membership
    Revoked,
    /// Inactive membership
    Inactive,
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
}
