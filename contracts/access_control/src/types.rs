use soroban_sdk::{contracttype, Address, Vec};

/// User roles in the access control system
/// Implements a hierarchical role system where Admin > Member > Guest
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum UserRole {
    Guest = 0,
    Member = 1,
    Admin = 2,
}

impl UserRole {
    /// Check if this role has sufficient privileges for the required role
    /// Returns true if this role >= required_role in the hierarchy
    pub fn has_access(&self, required_role: &UserRole) -> bool {
        self >= required_role
    }

    /// Convert role to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            UserRole::Guest => "Guest",
            UserRole::Member => "Member",
            UserRole::Admin => "Admin",
        }
    }

    pub fn parse_from_str(role_str: &str) -> Option<Self> {
        match role_str.to_ascii_lowercase().as_str() {
            "guest" => Some(UserRole::Guest),
            "member" => Some(UserRole::Member),
            "admin"  => Some(UserRole::Admin),
            _ => None,
        }
    }
}

/// Membership token information for cross-contract integration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MembershipInfo {
    /// Address of the user
    pub user: Address,
    /// Token balance (if any)
    pub balance: i128,
    /// Whether the user has active membership
    pub has_membership: bool,
}

/// Access control configuration
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, Default)]
pub struct AccessControlConfig {
    /// Address of the membership token contract
    pub membership_token_contract: Option<Address>,
    /// Whether to require membership tokens for role assignment
    pub require_membership_for_roles: bool,
    /// Minimum token balance required for membership
    pub min_token_balance: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultiSigConfig {
    pub admins: Vec<Address>,
    pub required_signatures: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingProposal {
    pub id: u64,
    pub proposer: Address,
    pub action: ProposalAction,
    pub approvals: Vec<Address>,
    pub executed: bool,
    pub expiry: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalAction {
    SetRole(Address, UserRole),
    UpdateConfig(AccessControlConfig),
    AddAdmin(Address),
    RemoveAdmin(Address),
    Pause,
    Unpause,
    TransferAdmin(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingAdminTransfer {
    pub proposed_admin: Address,
    pub proposer: Address,
    pub expiry: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_role_hierarchy() {
        assert!(UserRole::Admin.has_access(&UserRole::Guest));
        assert!(UserRole::Admin.has_access(&UserRole::Member));
        assert!(UserRole::Admin.has_access(&UserRole::Admin));

        assert!(UserRole::Member.has_access(&UserRole::Guest));
        assert!(UserRole::Member.has_access(&UserRole::Member));
        assert!(!UserRole::Member.has_access(&UserRole::Admin));

        assert!(UserRole::Guest.has_access(&UserRole::Guest));
        assert!(!UserRole::Guest.has_access(&UserRole::Member));
        assert!(!UserRole::Guest.has_access(&UserRole::Admin));
    }

    #[test]
    fn test_user_role_string_conversion() {
        assert_eq!(UserRole::Admin.as_str(), "Admin");
        assert_eq!(UserRole::Member.as_str(), "Member");
        assert_eq!(UserRole::Guest.as_str(), "Guest");

        assert_eq!(UserRole::parse_from_str("admin"), Some(UserRole::Admin));
        assert_eq!(UserRole::parse_from_str("MEMBER"), Some(UserRole::Member));
        assert_eq!(UserRole::parse_from_str("guest"), Some(UserRole::Guest));
        assert_eq!(UserRole::parse_from_str("invalid"), None);
    }
}
