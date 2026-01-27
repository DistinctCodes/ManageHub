#![no_std]

//! Common types for ManageHub contracts.
//!
//! This crate provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts.

mod types;

// Re-export all types
pub use types::{
    validate_attribute, validate_metadata, AttendanceAction, AttendanceFrequency, DateRange,
    DayPattern, MembershipStatus, MetadataUpdate, MetadataValue, PeakHourData, SubscriptionPlan,
    SubscriptionTier, TierChangeRequest, TierChangeStatus, TierChangeType, TierFeature, TierLevel,
    TierPromotion, TimePeriod, TokenMetadata, UserAttendanceStats, UserRole, MAX_ATTRIBUTES_COUNT,
    MAX_ATTRIBUTE_KEY_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TEXT_VALUE_LENGTH,
};

#[cfg(test)]
mod test_contract;
