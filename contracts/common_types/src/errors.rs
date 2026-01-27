//! Unified error handling system for ManageHub contracts.
//!
//! This module provides a comprehensive error enum that covers all contract operations
//! across the entire ManageHub system, enabling consistent error handling and recovery.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum ManageHubError {
    // ============================================================================
    // CRITICAL ERRORS (1-5)
    // ============================================================================
    /// Contract initialization failed
    ContractInitializationFailed = 1,
    /// Storage corruption detected
    StorageCorruption = 2,
    /// System maintenance mode active
    SystemMaintenanceMode = 3,

    // ============================================================================
    // AUTHENTICATION & AUTHORIZATION ERRORS (6-15)
    // ============================================================================
    /// User authentication required
    AuthenticationRequired = 6,
    /// Insufficient permissions for operation
    InsufficientPermissions = 7,
    /// Admin privileges required
    AdminPrivilegesRequired = 8,
    /// Account locked or suspended
    AccountLocked = 9,
    /// Session expired, re-authentication required
    SessionExpired = 10,

    // ============================================================================
    // SUBSCRIPTION ERRORS (11-20)
    // ============================================================================
    /// Subscription not found
    SubscriptionNotFound = 11,
    /// Subscription already exists with this ID
    SubscriptionAlreadyExists = 12,
    /// Subscription has expired
    SubscriptionExpired = 13,
    /// Subscription is inactive
    SubscriptionInactive = 14,
    /// Subscription renewal failed
    SubscriptionRenewalFailed = 15,

    // ============================================================================
    // PAYMENT ERRORS (16-25)
    // ============================================================================
    /// Invalid payment amount (must be positive)
    InvalidPaymentAmount = 16,
    /// Unsupported payment token
    InvalidPaymentToken = 17,
    /// Insufficient token balance
    InsufficientBalance = 18,
    /// Payment transaction failed
    PaymentTransactionFailed = 19,
    /// USDC contract not configured
    UsdcContractNotSet = 20,

    // ============================================================================
    // TOKEN & NFT ERRORS (21-30)
    // ============================================================================
    /// Token not found
    TokenNotFound = 21,
    /// Token already issued with this ID
    TokenAlreadyIssued = 22,
    /// Token has expired
    TokenExpired = 23,
    /// Invalid token expiry date
    InvalidExpiryDate = 24,
    /// Token metadata validation failed
    TokenMetadataValidationFailed = 25,
    /// Token metadata not found
    MetadataNotFound = 26,

    // ============================================================================
    // ATTENDANCE & LOGGING ERRORS (27-32)
    // ============================================================================
    /// Attendance logging failed
    AttendanceLogFailed = 27,
    /// Invalid event details provided
    InvalidEventDetails = 28,
    /// Attendance validation failed
    AttendanceValidationFailed = 29,

    // ============================================================================
    // TIER MANAGEMENT ERRORS (30-40)
    // ============================================================================
    /// Tier not found
    TierNotFound = 30,
    /// Tier already exists
    TierAlreadyExists = 31,
    /// Tier is not active
    TierNotActive = 32,
    /// Feature not available in current tier
    FeatureNotAvailable = 33,

    // ============================================================================
    // ACCESS CONTROL ERRORS (34-39)
    // ============================================================================
    /// Access control validation failed
    AccessControlValidationFailed = 34,
    /// Role not found
    RoleNotFound = 35,
    /// Permission denied for resource
    PermissionDenied = 36,
    /// Role hierarchy violation
    RoleHierarchyViolation = 37,

    // ============================================================================
    // VALIDATION & INPUT ERRORS (38-42)
    // ============================================================================
    /// Input validation failed
    InputValidationFailed = 38,
    /// Invalid string format
    InvalidStringFormat = 39,
    /// Timestamp overflow detected
    TimestampOverflow = 40,
    /// Invalid address format
    InvalidAddressFormat = 41,

    // ============================================================================
    // STORAGE & SYSTEM ERRORS (42-50)
    // ============================================================================
    /// Storage operation failed
    StorageOperationFailed = 42,
    /// Data not found in storage
    DataNotFound = 43,
    /// Network communication failed
    NetworkCommunicationFailed = 44,
    /// External service unavailable
    ExternalServiceUnavailable = 45,
    /// Business rule violation
    BusinessRuleViolation = 46,
    /// Operation not permitted in current state
    OperationNotPermittedInCurrentState = 47,
    /// Configuration error
    ConfigurationError = 48,
    /// Operation failed for unknown reason
    OperationFailed = 49,
    /// Temporary service unavailable
    TemporaryServiceUnavailable = 50,
}

impl ManageHubError {
    /// Returns whether this error is recoverable (can be retried or handled gracefully)
    pub fn is_recoverable(&self) -> bool {
        !matches!(self, Self::ContractInitializationFailed
            | Self::StorageCorruption
            | Self::SystemMaintenanceMode)
    }

    /// Returns whether this error requires immediate admin attention
    pub fn is_critical(&self) -> bool {
        matches!(self, Self::ContractInitializationFailed
            | Self::StorageCorruption
            | Self::SystemMaintenanceMode)
    }

    /// Returns the error category for logging and monitoring
    pub fn category(&self) -> ErrorCategory {
        match self {
            // Critical errors
            Self::ContractInitializationFailed
            | Self::StorageCorruption
            | Self::SystemMaintenanceMode => ErrorCategory::Critical,

            // Authentication errors
            Self::AuthenticationRequired
            | Self::InsufficientPermissions
            | Self::AdminPrivilegesRequired
            | Self::AccountLocked
            | Self::SessionExpired => ErrorCategory::Authentication,

            // Subscription errors
            Self::SubscriptionNotFound
            | Self::SubscriptionAlreadyExists
            | Self::SubscriptionExpired
            | Self::SubscriptionInactive
            | Self::SubscriptionRenewalFailed => ErrorCategory::Subscription,

            // Payment errors
            Self::InvalidPaymentAmount
            | Self::InvalidPaymentToken
            | Self::InsufficientBalance
            | Self::PaymentTransactionFailed
            | Self::UsdcContractNotSet => ErrorCategory::Payment,

            // Token errors
            Self::TokenNotFound
            | Self::TokenAlreadyIssued
            | Self::TokenExpired
            | Self::InvalidExpiryDate
            | Self::TokenMetadataValidationFailed
            | Self::MetadataNotFound => ErrorCategory::Token,

            // Attendance errors
            Self::AttendanceLogFailed
            | Self::InvalidEventDetails
            | Self::AttendanceValidationFailed => ErrorCategory::Attendance,

            // Tier errors
            Self::TierNotFound
            | Self::TierAlreadyExists
            | Self::TierNotActive
            | Self::FeatureNotAvailable => ErrorCategory::Tier,

            // Access control errors
            Self::AccessControlValidationFailed
            | Self::RoleNotFound
            | Self::PermissionDenied
            | Self::RoleHierarchyViolation => ErrorCategory::AccessControl,

            // Validation errors
            Self::InputValidationFailed
            | Self::InvalidStringFormat
            | Self::TimestampOverflow
            | Self::InvalidAddressFormat => ErrorCategory::Validation,

            // Storage and system errors
            Self::StorageOperationFailed
            | Self::DataNotFound
            | Self::NetworkCommunicationFailed
            | Self::ExternalServiceUnavailable
            | Self::BusinessRuleViolation
            | Self::OperationNotPermittedInCurrentState
            | Self::ConfigurationError
            | Self::OperationFailed
            | Self::TemporaryServiceUnavailable => ErrorCategory::Storage,
        }
    }
}

/// Error categories for classification and monitoring
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ErrorCategory {
    Critical,
    Authentication,
    Subscription,
    Payment,
    Token,
    Attendance,
    Tier,
    AccessControl,
    Validation,
    Storage,
}
