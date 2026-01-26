#![no_std]

//! Common types for ManageHub contracts.
//!
//! This crate provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts.

mod types;
mod errors;

// Re-export all types
pub use types::{
    validate_attribute, validate_metadata, AttendanceAction, MembershipStatus, MetadataUpdate,
    MetadataValue, SubscriptionPlan, SubscriptionTier, TierChangeRequest, TierChangeStatus,
    TierChangeType, TierFeature, TierLevel, TierPromotion, TokenMetadata, UserRole,
    MAX_ATTRIBUTES_COUNT, MAX_ATTRIBUTE_KEY_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_TEXT_VALUE_LENGTH,
};

// Re-export unified error system
pub use errors::{ErrorCategory, ManageHubError};

#[cfg(test)]
mod test_contract;
