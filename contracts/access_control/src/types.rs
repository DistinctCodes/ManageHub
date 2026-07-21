use soroban_sdk::{contracttype, Address, String, Vec};

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
        // eq_ignore_ascii_case is in core::str — no allocation, no_std safe.
        if role_str.eq_ignore_ascii_case("guest") {
            Some(UserRole::Guest)
        } else if role_str.eq_ignore_ascii_case("member") {
            Some(UserRole::Member)
        } else if role_str.eq_ignore_ascii_case("admin") {
            Some(UserRole::Admin)
        } else {
            None
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
    /// Address of the subscription/tier management contract
    pub subscription_contract: Option<Address>,
    /// Whether to enforce tier-based feature restrictions
    pub enforce_tier_restrictions: bool,
}

/// Subscription tier level for access control integration.
/// Must match TierLevel in common_types.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum SubscriptionTierLevel {
    /// Free tier with limited features
    Free = 0,
    /// Basic paid tier
    Basic = 1,
    /// Professional tier
    Pro = 2,
    /// Enterprise tier with all features
    Enterprise = 3,
}

impl SubscriptionTierLevel {
    /// Check if this tier has sufficient privileges for the required tier
    pub fn has_tier_access(&self, required_tier: &SubscriptionTierLevel) -> bool {
        self >= required_tier
    }

    /// Convert tier level to string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            SubscriptionTierLevel::Free => "Free",
            SubscriptionTierLevel::Basic => "Basic",
            SubscriptionTierLevel::Pro => "Pro",
            SubscriptionTierLevel::Enterprise => "Enterprise",
        }
    }
}

/// User subscription info for access control validation
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserSubscriptionStatus {
    /// User's current subscription tier level
    pub tier_level: SubscriptionTierLevel,
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
    /// Higher threshold for critical operations
    pub critical_threshold: u32,
    /// Even higher threshold for emergency operations
    pub emergency_threshold: u32,
    /// Default time-lock duration in seconds (e.g., 24 hours)
    pub time_lock_duration: u64,
    /// Maximum number of pending proposals
    pub max_pending_proposals: u32,
    /// Proposal expiration duration in seconds
    pub proposal_expiry_duration: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingProposal {
    pub id: u64,
    pub proposer: Address,
    pub action: ProposalAction,
    pub proposal_type: ProposalType,
    pub approvals: Vec<Address>,
    pub rejections: Vec<Address>,
    pub executed: bool,
    pub created_at: u64,
    pub expiry: u64,
    /// For time-locked proposals: earliest execution time
    pub time_lock_until: Option<u64>,
    /// Number of signatures required (can override default based on type)
    pub required_signatures: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalType {
    /// Regular operations requiring standard approval
    Standard,
    /// Critical operations with higher security requirements
    Critical,
    /// Emergency operations with special override procedures
    Emergency,
    /// Time-locked operations with mandatory delay
    TimeLocked,
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
    /// Critical operation: Update multisig configuration
    UpdateMultisigConfig(MultiSigConfig),
    /// Critical operation: Emergency pause with reason
    EmergencyPause(String),
    /// Critical operation: Blacklist multiple users
    BatchBlacklist(Vec<Address>),
    /// Time-locked operation: Schedule contract upgrade
    ScheduleUpgrade(Address, u64),
    /// Emergency operation: Force admin transfer
    EmergencyAdminTransfer(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PendingAdminTransfer {
    pub proposed_admin: Address,
    pub proposer: Address,
    pub expiry: u64,
}

/// Proposal statistics for tracking and analytics
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalStats {
    pub total_created: u64,
    pub total_executed: u64,
    pub total_rejected: u64,
    pub total_expired: u64,
    pub pending_count: u32,
}

impl ProposalType {
    /// Determine if this proposal type requires time-lock
    pub fn requires_time_lock(&self) -> bool {
        matches!(self, ProposalType::TimeLocked | ProposalType::Critical)
    }

    /// Get the required threshold multiplier for this proposal type
    pub fn get_threshold_multiplier(&self) -> u32 {
        match self {
            ProposalType::Standard => 1,
            ProposalType::Critical => 2,
            ProposalType::Emergency => 3,
            ProposalType::TimeLocked => 1,
        }
    }
}

impl ProposalAction {
    /// Classify the action type based on its security implications
    pub fn classify_type(&self) -> ProposalType {
        match self {
            ProposalAction::SetRole(_, _) => ProposalType::Standard,
            ProposalAction::UpdateConfig(_) => ProposalType::Critical,
            ProposalAction::AddAdmin(_) => ProposalType::Critical,
            ProposalAction::RemoveAdmin(_) => ProposalType::Critical,
            ProposalAction::Pause => ProposalType::Critical,
            ProposalAction::Unpause => ProposalType::Standard,
            ProposalAction::TransferAdmin(_) => ProposalType::Critical,
            ProposalAction::UpdateMultisigConfig(_) => ProposalType::Critical,
            ProposalAction::EmergencyPause(_) => ProposalType::Emergency,
            ProposalAction::BatchBlacklist(_) => ProposalType::Critical,
            ProposalAction::ScheduleUpgrade(_, _) => ProposalType::TimeLocked,
            ProposalAction::EmergencyAdminTransfer(_) => ProposalType::Emergency,
        }
    }

    /// Check if this action is reversible
    pub fn is_reversible(&self) -> bool {
        matches!(
            self,
            ProposalAction::SetRole(_, _)
                | ProposalAction::Pause
                | ProposalAction::Unpause
                | ProposalAction::BatchBlacklist(_)
        )
    }
}

impl MultiSigConfig {
    /// Create a default configuration for testing
    pub fn default_config() -> Self {
        MultiSigConfig {
            admins: Vec::new(&soroban_sdk::Env::default()),
            required_signatures: 2,
            critical_threshold: 3,
            emergency_threshold: 4,
            time_lock_duration: 86400, // 24 hours
            max_pending_proposals: 50,
            proposal_expiry_duration: 604800, // 7 days
        }
    }

    /// Validate configuration parameters
    pub fn validate(&self) -> bool {
        !self.admins.is_empty()
            && self.required_signatures > 0
            && self.required_signatures <= self.admins.len()
            && self.critical_threshold >= self.required_signatures
            && self.emergency_threshold >= self.critical_threshold
            && self.emergency_threshold <= self.admins.len()
            && self.time_lock_duration > 0
            && self.max_pending_proposals > 0
            && self.proposal_expiry_duration > 0
    }

    /// Get required signatures for a specific proposal type
    pub fn get_required_signatures(&self, proposal_type: &ProposalType) -> u32 {
        match proposal_type {
            ProposalType::Standard => self.required_signatures,
            ProposalType::Critical | ProposalType::TimeLocked => self.critical_threshold,
            ProposalType::Emergency => self.emergency_threshold,
        }
    }
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
