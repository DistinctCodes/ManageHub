#![no_std]

//! Common types for ManageHub contracts.
//!
//! This crate provides shared enums and structs to ensure consistency
//! across all ManageHub smart contracts.

mod types;

// Re-export all types
pub use types::{AttendanceAction, MembershipStatus, SubscriptionPlan, UserRole};

#[cfg(test)]
mod test_contract;
