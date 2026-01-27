use soroban_sdk::contracterror;

/// Result type for access control operations
pub type AccessControlResult<T> = Result<T, AccessControlError>;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum AccessControlError {
    Unauthorized = 100,
    AdminRequired = 101,
    AccountLocked = 102,
    SessionExpired = 103,
    InvalidRole = 104,
    PermissionDenied = 105,
    StorageError = 106,
    ConfigurationError = 107,
    InvalidAddress = 108,
    InsufficientRole = 109,
    NotInitialized = 110,
    ContractPaused = 111,
    InsufficientMembership = 112,
    MembershipTokenNotSet = 113,
    MembershipTokenCallFailed = 114,
    RoleHierarchyViolation = 115,
}

impl AccessControlError {
    pub fn message(&self) -> &'static str {
        match self {
            AccessControlError::Unauthorized => "Caller is not authorized",
            AccessControlError::AdminRequired => "Admin privileges required",
            AccessControlError::AccountLocked => "Account is locked",
            AccessControlError::SessionExpired => "Session has expired",
            AccessControlError::InvalidRole => "Invalid role specified",
            AccessControlError::PermissionDenied => "Permission denied",
            AccessControlError::StorageError => "Storage operation failed",
            AccessControlError::ConfigurationError => "Configuration error detected",
            AccessControlError::InvalidAddress => "Invalid address provided",
            AccessControlError::InsufficientRole => "Insufficient role for operation",
            AccessControlError::NotInitialized => "Access control not initialized",
            AccessControlError::ContractPaused => "Contract is paused",
            AccessControlError::InsufficientMembership => "Insufficient membership level",
            AccessControlError::MembershipTokenNotSet => "Membership token not configured",
            AccessControlError::MembershipTokenCallFailed => "Membership token call failed",
            AccessControlError::RoleHierarchyViolation => "Role hierarchy violation",
        }
    }

    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            AccessControlError::SessionExpired
                | AccessControlError::Unauthorized
                | AccessControlError::StorageError
                | AccessControlError::MembershipTokenCallFailed
        )
    }
}
