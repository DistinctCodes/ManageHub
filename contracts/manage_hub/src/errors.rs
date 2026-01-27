//! Error handling for ManageHub contracts.
//!
//! This module provides error mapping between the unified ManageHubError system
//! and local contract operations, enabling consistent error handling while
//! maintaining backward compatibility.

pub use common_types::ManageHubError;
use soroban_sdk::contracterror;

/// Local error enum for backward compatibility.
/// Maps to ManageHubError for consistent error handling.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AdminNotSet = 1,
    TokenAlreadyIssued = 2,
    TokenNotFound = 3,
    Unauthorized = 4,
    TokenExpired = 5,
    InvalidExpiryDate = 6,
    InvalidEventDetails = 7,
    InvalidPaymentAmount = 8,
    InvalidPaymentToken = 9,
    SubscriptionNotFound = 10,
    UsdcContractNotSet = 11,
    AttendanceLogFailed = 12,
    SubscriptionAlreadyExists = 13,
    InsufficientBalance = 14,
    TimestampOverflow = 15,
    MetadataNotFound = 16,

    TierNotFound = 17,
    TierAlreadyExists = 18,
    TierNotActive = 19,
    FeatureNotAvailable = 20,
    // New comprehensive error handling
    AuthenticationRequired = 21,
    InsufficientPermissions = 22,
    SubscriptionExpired = 23,
    PaymentTransactionFailed = 24,
    InputValidationFailed = 25,
    StorageOperationFailed = 26,
    BusinessRuleViolation = 27,
    OperationFailed = 28,
    // Metadata related errors
    MetadataDescriptionTooLong = 29,
    MetadataTooManyAttributes = 30,
    MetadataAttributeKeyTooLong = 31,
    MetadataTextValueTooLong = 32,
    MetadataValidationFailed = 33,
    InvalidMetadataVersion = 34,
    // Pause/Resume related errors
    InvalidPauseConfig = 35,
    SubscriptionPaused = 36,
    SubscriptionNotActive = 37,
    PauseCountExceeded = 38,
    PauseTooEarly = 39,
    SubscriptionNotPaused = 40,
    // Additional tier and feature related errors
    TierChangeAlreadyProcessed = 41,
    InvalidDiscountPercent = 42,
    InvalidPromoDateRange = 43,
    PromotionAlreadyExists = 44,
    PromotionNotFound = 45,
    PromoCodeExpired = 46,
    PromoCodeMaxRedemptions = 47,
    PromoCodeInvalid = 48,
    // Tier management errors
    InvalidTierPrice = 49,
    TierChangeNotFound = 50,
}

impl Error {
    /// Convert local Error to unified ManageHubError
    pub fn to_unified_error(self) -> ManageHubError {
        match self {
            // Authentication & Authorization
            Error::Unauthorized => ManageHubError::InsufficientPermissions,
            Error::AuthenticationRequired => ManageHubError::AuthenticationRequired,
            Error::InsufficientPermissions => ManageHubError::InsufficientPermissions,

            // Subscription Management
            Error::SubscriptionNotFound => ManageHubError::SubscriptionNotFound,
            Error::SubscriptionAlreadyExists => ManageHubError::SubscriptionAlreadyExists,
            Error::SubscriptionExpired => ManageHubError::SubscriptionExpired,

            // Payment Processing
            Error::InvalidPaymentAmount => ManageHubError::InvalidPaymentAmount,
            Error::InvalidPaymentToken => ManageHubError::InvalidPaymentToken,
            Error::InsufficientBalance => ManageHubError::InsufficientBalance,
            Error::UsdcContractNotSet => ManageHubError::UsdcContractNotSet,
            Error::PaymentTransactionFailed => ManageHubError::PaymentTransactionFailed,

            // Token Management
            Error::TokenAlreadyIssued => ManageHubError::TokenAlreadyIssued,
            Error::TokenNotFound => ManageHubError::TokenNotFound,
            Error::TokenExpired => ManageHubError::TokenExpired,
            Error::InvalidExpiryDate => ManageHubError::InvalidExpiryDate,

            // Metadata
            Error::MetadataNotFound => ManageHubError::MetadataNotFound,

            // Attendance
            Error::AttendanceLogFailed => ManageHubError::AttendanceLogFailed,
            Error::InvalidEventDetails => ManageHubError::InvalidEventDetails,

            // Tier Management
            Error::TierNotFound => ManageHubError::TierNotFound,
            Error::TierAlreadyExists => ManageHubError::TierAlreadyExists,
            Error::TierNotActive => ManageHubError::TierNotActive,
            Error::FeatureNotAvailable => ManageHubError::FeatureNotAvailable,

            // Validation & General
            Error::TimestampOverflow => ManageHubError::TimestampOverflow,
            Error::InputValidationFailed => ManageHubError::InputValidationFailed,
            Error::StorageOperationFailed => ManageHubError::StorageOperationFailed,
            Error::BusinessRuleViolation => ManageHubError::BusinessRuleViolation,
            Error::OperationFailed => ManageHubError::OperationFailed,
            Error::AdminNotSet => ManageHubError::ConfigurationError,

            // Additional Metadata
            Error::MetadataDescriptionTooLong => ManageHubError::TokenMetadataValidationFailed,
            Error::MetadataTooManyAttributes => ManageHubError::TokenMetadataValidationFailed,
            Error::MetadataAttributeKeyTooLong => ManageHubError::TokenMetadataValidationFailed,
            Error::MetadataTextValueTooLong => ManageHubError::TokenMetadataValidationFailed,
            Error::MetadataValidationFailed => ManageHubError::TokenMetadataValidationFailed,
            Error::InvalidMetadataVersion => ManageHubError::TokenMetadataValidationFailed,

            // Pause/Resume functionality
            Error::InvalidPauseConfig => ManageHubError::ConfigurationError,
            Error::SubscriptionPaused => ManageHubError::SubscriptionInactive,
            Error::SubscriptionNotActive => ManageHubError::SubscriptionInactive,
            Error::PauseCountExceeded => ManageHubError::BusinessRuleViolation,
            Error::PauseTooEarly => ManageHubError::BusinessRuleViolation,
            Error::SubscriptionNotPaused => ManageHubError::OperationNotPermittedInCurrentState,

            // Additional Tier functionality
            Error::TierChangeAlreadyProcessed => ManageHubError::BusinessRuleViolation,
            Error::InvalidDiscountPercent => ManageHubError::InputValidationFailed,
            Error::InvalidPromoDateRange => ManageHubError::InputValidationFailed,
            Error::PromotionAlreadyExists => ManageHubError::BusinessRuleViolation,
            Error::PromotionNotFound => ManageHubError::DataNotFound,
            Error::PromoCodeExpired => ManageHubError::BusinessRuleViolation,
            Error::PromoCodeMaxRedemptions => ManageHubError::BusinessRuleViolation,
            Error::PromoCodeInvalid => ManageHubError::InputValidationFailed,
            Error::InvalidTierPrice => ManageHubError::InputValidationFailed,
            Error::TierChangeNotFound => ManageHubError::DataNotFound,
        }
    }

    /// Check if error is recoverable
    pub fn is_recoverable(self) -> bool {
        self.to_unified_error().is_recoverable()
    }

    /// Check if error is critical
    pub fn is_critical(self) -> bool {
        self.to_unified_error().is_critical()
    }
}
