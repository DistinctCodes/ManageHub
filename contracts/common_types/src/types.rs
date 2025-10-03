//! Common types used across ManageHub contracts.
//!
//! This module provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts, including subscription management,
//! attendance tracking, and user role definitions.

use soroban_sdk::contracttype;

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
    /// Expired membership
    Expired,
    /// Revoked membership
    Revoked,
    /// Inactive membership
    Inactive,
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
        let expired = MembershipStatus::Expired;
        let revoked = MembershipStatus::Revoked;
        let inactive = MembershipStatus::Inactive;

        assert_eq!(active, MembershipStatus::Active);
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
