use common_types::{TierLevel, UserRole};
use soroban_sdk::{contracttype, Address, Vec};

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
    /// Address of the subscription/tier management contract
    pub subscription_contract: Option<Address>,
    /// Whether to enforce tier-based feature restrictions
    pub enforce_tier_restrictions: bool,
}

/// User subscription info for access control validation
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserSubscriptionStatus {
    /// User's current subscription tier level
    pub tier_level: TierLevel,
    /// Whether subscription is currently active
    pub is_active: bool,
    /// Subscription expiry timestamp
    pub expires_at: u64,
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
