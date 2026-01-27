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
    MetadataDescriptionTooLong = 17,
    MetadataTooManyAttributes = 18,
    MetadataAttributeKeyTooLong = 19,
    MetadataTextValueTooLong = 20,
    MetadataValidationFailed = 21,
    InvalidMetadataVersion = 22,
    // Pause/Resume related errors
    InvalidPauseConfig = 23,
    SubscriptionPaused = 24,
    SubscriptionNotActive = 25,
    PauseCountExceeded = 26,
    PauseTooEarly = 27,
    SubscriptionNotPaused = 28,
    // Tier and feature related errors
    TierNotFound = 29,
    FeatureNotAvailable = 30,
    // Tier change related errors
    TierChangeAlreadyProcessed = 31,
    InvalidDiscountPercent = 32,
    InvalidPromoDateRange = 33,
    PromotionAlreadyExists = 34,
    PromotionNotFound = 35,
    PromoCodeExpired = 36,
    PromoCodeMaxRedemptions = 37,
    PromoCodeInvalid = 38,
    // Tier management errors
    InvalidTierPrice = 39,
    TierAlreadyExists = 40,
    TierNotActive = 41,
    TierChangeNotFound = 42,
}
