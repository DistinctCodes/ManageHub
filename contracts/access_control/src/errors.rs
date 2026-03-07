use soroban_sdk::contracterror;

/// Access control specific errors
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AccessControlError {
    /// Caller is not authorized to perform this action
    Unauthorized = 100,
    /// Caller does not have admin privileges
    AdminRequired = 101,
    /// Invalid role specified
    InvalidRole = 102,
    /// User does not have the required role
    InsufficientRole = 103,
    /// Role assignment failed
    RoleAssignmentFailed = 104,
    /// Membership token contract not configured
    MembershipTokenNotSet = 105,
    /// Cross-contract call to membership token failed
    MembershipTokenCallFailed = 106,
    /// User does not have required membership token
    InsufficientMembership = 107,
    /// Invalid membership token balance
    InvalidTokenBalance = 108,
    /// Access control not initialized
    NotInitialized = 109,
    /// Configuration error
    ConfigurationError = 110,
    /// Storage operation failed
    StorageError = 111,
    /// Invalid address provided
    InvalidAddress = 112,
    /// Role hierarchy violation
    RoleHierarchyViolation = 113,
    /// Maximum roles per user exceeded
    MaxRolesExceeded = 114,
    /// Contract is paused
    ContractPaused = 115,
    /// Multisig not enabled for this operation
    MultisigNotEnabled = 116,
    /// Insufficient approvals for proposal execution
    InsufficientApprovals = 117,
    /// Proposal not found
    ProposalNotFound = 118,
    /// Proposal already executed
    ProposalAlreadyExecuted = 119,
    /// Proposal has expired
    ProposalExpired = 120,
    /// Time-lock not yet passed
    TimeLockActive = 121,
    /// Already approved this proposal
    AlreadyApproved = 122,
    /// Already rejected this proposal
    AlreadyRejected = 123,
    /// Cannot execute proposal yet
    CannotExecuteProposal = 124,
    /// Maximum pending proposals reached
    MaxProposalsReached = 125,
    /// Invalid proposal type for this action
    InvalidProposalType = 126,
    /// Invalid multisig configuration
    InvalidMultisigConfig = 127,
    /// Threshold too high for number of admins
    ThresholdTooHigh = 128,
    /// Threshold too low for security requirements
    ThresholdTooLow = 129,
    /// Cannot remove last admin
    CannotRemoveLastAdmin = 130,
    /// Duplicate admin address
    DuplicateAdmin = 131,
    /// Not authorized as multisig admin
    NotMultisigAdmin = 132,
    /// Proposal rejection threshold reached
    ProposalRejected = 133,
}

impl AccessControlError {
    /// Get a human-readable description of the error
    pub fn description(&self) -> &'static str {
        match self {
            AccessControlError::Unauthorized => "Caller is not authorized to perform this action",
            AccessControlError::AdminRequired => "Admin privileges required for this operation",
            AccessControlError::InvalidRole => "Invalid role specified",
            AccessControlError::InsufficientRole => "User does not have the required role",
            AccessControlError::RoleAssignmentFailed => "Failed to assign role to user",
            AccessControlError::MembershipTokenNotSet => "Membership token contract not configured",
            AccessControlError::MembershipTokenCallFailed => {
                "Cross-contract call to membership token failed"
            }
            AccessControlError::InsufficientMembership => {
                "User does not have required membership token"
            }
            AccessControlError::InvalidTokenBalance => "Invalid membership token balance",
            AccessControlError::NotInitialized => "Access control system not initialized",
            AccessControlError::ConfigurationError => "Access control configuration error",
            AccessControlError::StorageError => "Storage operation failed",
            AccessControlError::InvalidAddress => "Invalid address provided",
            AccessControlError::RoleHierarchyViolation => "Role hierarchy violation",
            AccessControlError::MaxRolesExceeded => "Maximum roles per user exceeded",
            AccessControlError::ContractPaused => "Contract is currently paused",
            AccessControlError::MultisigNotEnabled => "Multisig not enabled for this operation",
            AccessControlError::InsufficientApprovals => {
                "Insufficient approvals for proposal execution"
            }
            AccessControlError::ProposalNotFound => "Proposal not found",
            AccessControlError::ProposalAlreadyExecuted => "Proposal already executed",
            AccessControlError::ProposalExpired => "Proposal has expired",
            AccessControlError::TimeLockActive => "Time-lock period not yet passed",
            AccessControlError::AlreadyApproved => "Already approved this proposal",
            AccessControlError::AlreadyRejected => "Already rejected this proposal",
            AccessControlError::CannotExecuteProposal => "Cannot execute proposal yet",
            AccessControlError::MaxProposalsReached => "Maximum pending proposals reached",
            AccessControlError::InvalidProposalType => "Invalid proposal type for this action",
            AccessControlError::InvalidMultisigConfig => "Invalid multisig configuration",
            AccessControlError::ThresholdTooHigh => "Threshold too high for number of admins",
            AccessControlError::ThresholdTooLow => "Threshold too low for security requirements",
            AccessControlError::CannotRemoveLastAdmin => "Cannot remove the last admin",
            AccessControlError::DuplicateAdmin => "Duplicate admin address",
            AccessControlError::NotMultisigAdmin => "Not authorized as multisig admin",
            AccessControlError::ProposalRejected => "Proposal rejection threshold reached",
        }
    }

    /// Check if this is a critical error that should halt execution
    pub fn is_critical(&self) -> bool {
        matches!(
            self,
            AccessControlError::NotInitialized
                | AccessControlError::ConfigurationError
                | AccessControlError::StorageError
                | AccessControlError::ContractPaused
        )
    }

    /// Check if this error is related to permissions
    pub fn is_permission_error(&self) -> bool {
        matches!(
            self,
            AccessControlError::Unauthorized
                | AccessControlError::AdminRequired
                | AccessControlError::InsufficientRole
                | AccessControlError::InsufficientMembership
        )
    }

    /// Check if this error is related to membership tokens
    pub fn is_membership_error(&self) -> bool {
        matches!(
            self,
            AccessControlError::MembershipTokenNotSet
                | AccessControlError::MembershipTokenCallFailed
                | AccessControlError::InsufficientMembership
                | AccessControlError::InvalidTokenBalance
        )
    }
}

/// Result type for access control operations
pub type AccessControlResult<T> = Result<T, AccessControlError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_descriptions() {
        assert!(!AccessControlError::Unauthorized.description().is_empty());
        assert!(!AccessControlError::AdminRequired.description().is_empty());
        assert!(!AccessControlError::InvalidRole.description().is_empty());
    }

    #[test]
    fn test_error_categories() {
        assert!(AccessControlError::NotInitialized.is_critical());
        assert!(!AccessControlError::Unauthorized.is_critical());

        assert!(AccessControlError::Unauthorized.is_permission_error());
        assert!(!AccessControlError::InvalidRole.is_permission_error());

        assert!(AccessControlError::MembershipTokenNotSet.is_membership_error());
        assert!(!AccessControlError::Unauthorized.is_membership_error());
    }

    #[test]
    fn test_error_codes() {
        // Ensure error codes are unique and in expected range
        assert_eq!(AccessControlError::Unauthorized as u32, 100);
        assert_eq!(AccessControlError::AdminRequired as u32, 101);
        assert_eq!(AccessControlError::ContractPaused as u32, 115);
    }
}
