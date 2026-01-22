use soroban_sdk::{contracttype, symbol_short, Address, Env, IntoVal, Symbol, Vec};

use crate::errors::{AccessControlError, AccessControlResult};
use crate::types::{
    AccessControlConfig, MembershipInfo, MultiSigConfig, PendingAdminTransfer, PendingProposal,
    ProposalAction, UserRole,
};

/// Storage keys for the access control module
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    UserRole(Address),
    Admin,
    Config,
    Initialized,
    Paused,
    Blacklisted(Address),
    AccessAttempts(Address),
    MultiSigConfig,
    Proposal(u64),
    ProposalCounter,
    PendingAdminTransfer,
}

pub struct AccessControlModule;

impl AccessControlModule {
    pub fn initialize(
        env: &Env,
        admin: Address,
        config: Option<AccessControlConfig>,
    ) -> AccessControlResult<()> {
        if Self::is_initialized(env) {
            return Err(AccessControlError::ConfigurationError);
        }

        env.storage().persistent().set(&DataKey::Admin, &admin);

        env.storage()
            .persistent()
            .set(&DataKey::UserRole(admin.clone()), &UserRole::Admin);

        let config = config.unwrap_or_default();
        env.storage().persistent().set(&DataKey::Config, &config);

        env.storage().persistent().set(&DataKey::Initialized, &true);

        env.storage().persistent().set(&DataKey::Paused, &false);

        env.storage()
            .persistent()
            .set(&DataKey::ProposalCounter, &0u64);

        // Emit initialization event
        env.events().publish(
            (symbol_short!("init"), admin.clone()),
            config.clone()
        );

        Ok(())
    }

    pub fn initialize_multisig(
        env: &Env,
        admins: Vec<Address>,
        required_signatures: u32,
        config: Option<AccessControlConfig>,
    ) -> AccessControlResult<()> {
        if Self::is_initialized(env) {
            return Err(AccessControlError::ConfigurationError);
        }

        if admins.is_empty() || required_signatures == 0 || required_signatures > admins.len() {
            return Err(AccessControlError::InvalidAddress);
        }

        let multisig_config = MultiSigConfig {
            admins: admins.clone(),
            required_signatures,
        };

        env.storage()
            .persistent()
            .set(&DataKey::MultiSigConfig, &multisig_config);

        for admin in admins.iter() {
            env.storage()
                .persistent()
                .set(&DataKey::UserRole(admin.clone()), &UserRole::Admin);
        }

        let config = config.unwrap_or_default();
        env.storage().persistent().set(&DataKey::Config, &config);

        env.storage().persistent().set(&DataKey::Initialized, &true);

        env.storage().persistent().set(&DataKey::Paused, &false);

        env.storage()
            .persistent()
            .set(&DataKey::ProposalCounter, &0u64);

        // Emit multisig initialization event
        env.events().publish(
            (symbol_short!("ms_init"), required_signatures),
            (admins.clone(), config.clone())
        );

        Ok(())
    }

    pub fn set_role(
        env: &Env,
        caller: Address,
        user: Address,
        role: UserRole,
    ) -> AccessControlResult<()> {
        Self::require_initialized(env)?;
        Self::require_not_paused(env)?;
        Self::require_not_blacklisted(env, &user)?;
        Self::require_admin(env, &caller)?;

        Self::validate_role_assignment(env, &user, &role)?;

        let old_role = Self::get_role(env, user.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserRole(user.clone()), &role);

        env.events().publish(
            (symbol_short!("role_set"), user.clone(), role.clone()),
            (caller.clone(), old_role),
        );

        Ok(())
    }

    /// Get role for a user
    pub fn get_role(env: &Env, user: Address) -> UserRole {
        env.storage()
            .persistent()
            .get(&DataKey::UserRole(user))
            .unwrap_or(UserRole::Guest)
    }

    /// Check if user has access for required role
    pub fn check_access(
        env: &Env,
        user: Address,
        required_role: UserRole,
    ) -> AccessControlResult<bool> {
        Self::require_initialized(env)?;
        Self::require_not_paused(env)?;

        if Self::is_blacklisted(env, &user) {
            env.events().publish(
                (
                    symbol_short!("acc_deny"),
                    user.clone(),
                    required_role.clone(),
                ),
                "blacklisted",
            );
            return Ok(false);
        }

        let user_role = Self::get_role(env, user.clone());
        let has_access = user_role.has_access(&required_role);

        if !has_access {
            Self::log_access_attempt(env, &user, &required_role, false);
            return Ok(false);
        }

        match Self::validate_membership_access(env, &user, &required_role) {
            Ok(_) => {
                Self::log_access_attempt(env, &user, &required_role, true);
                Ok(true)
            }
            Err(_) => {
                Self::log_access_attempt(env, &user, &required_role, false);
                Ok(false)
            }
        }
    }

    /// Require that user has access for the specified role
    /// Panics with Unauthorized if access is denied
    pub fn require_access(
        env: &Env,
        user: Address,
        required_role: UserRole,
    ) -> AccessControlResult<()> {
        if !Self::check_access(env, user, required_role)? {
            return Err(AccessControlError::InsufficientRole);
        }
        Ok(())
    }

    /// Check if user is admin
    pub fn is_admin(env: &Env, user: Address) -> bool {
        let user_role = Self::get_role(env, user);
        matches!(user_role, UserRole::Admin)
    }

    pub fn require_admin(env: &Env, caller: &Address) -> AccessControlResult<()> {
        if let Some(multisig_config) = Self::get_multisig_config(env) {
            if multisig_config.admins.contains(caller) {
                return Ok(());
            }
        } else if Self::is_admin(env, caller.clone()) {
            return Ok(());
        }
        Err(AccessControlError::AdminRequired)
    }

    /// Check if the system is initialized
    pub fn is_initialized(env: &Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Initialized)
            .unwrap_or(false)
    }

    /// Require that the system is initialized
    fn require_initialized(env: &Env) -> AccessControlResult<()> {
        if !Self::is_initialized(env) {
            return Err(AccessControlError::NotInitialized);
        }
        Ok(())
    }

    /// Check if the contract is paused
    pub fn is_paused(env: &Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Require that the contract is not paused
    fn require_not_paused(env: &Env) -> AccessControlResult<()> {
        if Self::is_paused(env) {
            return Err(AccessControlError::ContractPaused);
        }
        Ok(())
    }

    /// Get the current configuration
    pub fn get_config(env: &Env) -> AccessControlConfig {
        env.storage()
            .persistent()
            .get(&DataKey::Config)
            .unwrap_or_default()
    }

    /// Update configuration (admin only)
    pub fn update_config(
        env: &Env,
        caller: Address,
        config: AccessControlConfig,
    ) -> AccessControlResult<()> {
        if Self::is_multisig_enabled(env) {
            return Err(AccessControlError::AdminRequired);
        }

        Self::require_admin(env, &caller)?;

        let old_config = Self::get_config(env);
        env.storage().persistent().set(&DataKey::Config, &config);

        env.events().publish(
            (symbol_short!("cfg_upd"), config.clone()),
            (caller.clone(), old_config),
        );

        Ok(())
    }

    /// Pause the contract (admin only)
    pub fn pause(env: &Env, caller: Address) -> AccessControlResult<()> {
        if Self::is_multisig_enabled(env) {
            return Err(AccessControlError::AdminRequired);
        }

        Self::require_admin(env, &caller)?;

        env.storage().persistent().set(&DataKey::Paused, &true);

        env.events()
            .publish((symbol_short!("paused"), true), caller.clone());

        Ok(())
    }

    /// Unpause the contract (admin only)
    pub fn unpause(env: &Env, caller: Address) -> AccessControlResult<()> {
        if Self::is_multisig_enabled(env) {
            return Err(AccessControlError::AdminRequired);
        }

        Self::require_admin(env, &caller)?;

        env.storage().persistent().set(&DataKey::Paused, &false);

        env.events()
            .publish((symbol_short!("unpaused"), false), caller.clone());

        Ok(())
    }

    fn validate_role_assignment(
        env: &Env,
        user: &Address,
        role: &UserRole,
    ) -> AccessControlResult<()> {
        let config = Self::get_config(env);

        if config.require_membership_for_roles && matches!(role, UserRole::Member | UserRole::Admin)
        {
            if let Some(membership_contract) = config.membership_token_contract {
                let membership_info =
                    Self::check_membership_token(env, &membership_contract, user)?;

                if membership_info.balance < config.min_token_balance {
                    return Err(AccessControlError::InsufficientMembership);
                }
            } else {
                return Err(AccessControlError::MembershipTokenNotSet);
            }
        }

        Ok(())
    }

    fn validate_membership_access(
        env: &Env,
        user: &Address,
        required_role: &UserRole,
    ) -> AccessControlResult<()> {
        let config = Self::get_config(env);

        if config.require_membership_for_roles
            && matches!(required_role, UserRole::Member | UserRole::Admin)
        {
            if let Some(membership_contract) = config.membership_token_contract {
                let membership_info =
                    Self::check_membership_token(env, &membership_contract, user)?;

                if membership_info.balance < config.min_token_balance {
                    return Err(AccessControlError::InsufficientMembership);
                }
            }
        }

        Ok(())
    }

    fn check_membership_token(
        env: &Env,
        membership_contract: &Address,
        user: &Address,
    ) -> AccessControlResult<MembershipInfo> {
        let balance_symbol = Symbol::new(env, "balance_of");
        let balance_args = Vec::from_array(env, [user.into_val(env)]);

        let balance: i128 = match env.try_invoke_contract::<i128, AccessControlError>(
            membership_contract,
            &balance_symbol,
            balance_args,
        ) {
            Ok(Ok(balance)) => balance,
            Ok(Err(_)) => return Err(AccessControlError::MembershipTokenCallFailed),
            Err(_) => return Err(AccessControlError::MembershipTokenCallFailed),
        };

        let has_membership = balance > 0;

        Ok(MembershipInfo {
            user: user.clone(),
            balance,
            has_membership,
        })
    }

    /// Get admin address
    pub fn get_admin(env: &Env) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Admin)
    }

    pub fn propose_admin_transfer(
        env: &Env,
        current_admin: Address,
        new_admin: Address,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &current_admin)?;

        if current_admin == new_admin {
            return Err(AccessControlError::InvalidAddress);
        }

        if Self::is_multisig_enabled(env) {
            return Err(AccessControlError::InvalidAddress);
        }

        let pending_transfer = PendingAdminTransfer {
            proposed_admin: new_admin.clone(),
            proposer: current_admin.clone(),
            expiry: env.ledger().timestamp() + 86400, // 24 hours
        };

        env.storage()
            .persistent()
            .set(&DataKey::PendingAdminTransfer, &pending_transfer);

        env.events().publish(
            (symbol_short!("adm_prop"), new_admin.clone()),
            current_admin.clone(),
        );

        Ok(())
    }

    pub fn accept_admin_transfer(env: &Env, new_admin: Address) -> AccessControlResult<()> {
        let pending_transfer: PendingAdminTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdminTransfer)
            .ok_or(AccessControlError::InvalidAddress)?;

        if pending_transfer.proposed_admin != new_admin {
            return Err(AccessControlError::Unauthorized);
        }

        if env.ledger().timestamp() > pending_transfer.expiry {
            return Err(AccessControlError::InvalidAddress);
        }

        let old_admin = Self::get_admin(env).ok_or(AccessControlError::AdminRequired)?;

        env.storage().persistent().set(&DataKey::Admin, &new_admin);

        env.storage()
            .persistent()
            .set(&DataKey::UserRole(new_admin.clone()), &UserRole::Admin);

        env.storage()
            .persistent()
            .set(&DataKey::UserRole(old_admin.clone()), &UserRole::Guest);

        env.storage()
            .persistent()
            .remove(&DataKey::PendingAdminTransfer);

        env.events().publish(
            (symbol_short!("adm_xfer"), new_admin.clone()),
            old_admin.clone(),
        );

        Ok(())
    }

    pub fn cancel_admin_transfer(env: &Env, current_admin: Address) -> AccessControlResult<()> {
        Self::require_admin(env, &current_admin)?;

        let pending_transfer: PendingAdminTransfer = env
            .storage()
            .persistent()
            .get(&DataKey::PendingAdminTransfer)
            .ok_or(AccessControlError::InvalidAddress)?;

        if pending_transfer.proposer != current_admin {
            return Err(AccessControlError::Unauthorized);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::PendingAdminTransfer);

        env.events().publish(
            (
                symbol_short!("adm_canc"),
                pending_transfer.proposed_admin.clone(),
            ),
            current_admin.clone(),
        );

        Ok(())
    }

    pub fn get_pending_admin_transfer(env: &Env) -> Option<PendingAdminTransfer> {
        env.storage()
            .persistent()
            .get(&DataKey::PendingAdminTransfer)
    }

    pub fn remove_role(env: &Env, caller: Address, user: Address) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        if let Some(admin) = Self::get_admin(env) {
            if user == admin {
                return Err(AccessControlError::RoleHierarchyViolation);
            }
        }

        if caller == user && Self::get_role(env, user.clone()) == UserRole::Admin {
            return Err(AccessControlError::RoleHierarchyViolation);
        }

        let old_role = Self::get_role(env, user.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserRole(user.clone()), &UserRole::Guest);

        env.events().publish(
            (symbol_short!("role_rm"), user.clone()),
            (caller.clone(), old_role),
        );

        Ok(())
    }

    pub fn blacklist_user(env: &Env, caller: Address, user: Address) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        env.storage()
            .persistent()
            .set(&DataKey::Blacklisted(user.clone()), &true);

        env.events()
            .publish((symbol_short!("usr_black"), user.clone()), caller.clone());

        Ok(())
    }

    pub fn unblacklist_user(env: &Env, caller: Address, user: Address) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        env.storage()
            .persistent()
            .remove(&DataKey::Blacklisted(user.clone()));

        env.events()
            .publish((symbol_short!("usr_white"), user.clone()), caller.clone());

        Ok(())
    }

    pub fn is_blacklisted(env: &Env, user: &Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Blacklisted(user.clone()))
            .unwrap_or(false)
    }

    fn require_not_blacklisted(env: &Env, user: &Address) -> AccessControlResult<()> {
        if Self::is_blacklisted(env, user) {
            return Err(AccessControlError::Unauthorized);
        }
        Ok(())
    }

    fn log_access_attempt(env: &Env, user: &Address, required_role: &UserRole, success: bool) {
        let current_attempts: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::AccessAttempts(user.clone()))
            .unwrap_or(0);

        env.storage().persistent().set(
            &DataKey::AccessAttempts(user.clone()),
            &(current_attempts + 1),
        );

        env.events().publish(
            (
                symbol_short!("acc_try"),
                user.clone(),
                required_role.clone(),
            ),
            (success, current_attempts + 1),
        );
    }

    pub fn is_multisig_enabled(env: &Env) -> bool {
        env.storage()
            .persistent()
            .get::<DataKey, MultiSigConfig>(&DataKey::MultiSigConfig)
            .is_some()
    }

    pub fn get_multisig_config(env: &Env) -> Option<MultiSigConfig> {
        env.storage()
            .persistent()
            .get::<DataKey, MultiSigConfig>(&DataKey::MultiSigConfig)
    }

    pub fn create_proposal(
        env: &Env,
        proposer: Address,
        action: ProposalAction,
    ) -> AccessControlResult<u64> {
        Self::require_admin(env, &proposer)?;

        let proposal_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalCounter)
            .unwrap_or(0);

        let mut approvals = Vec::new(env);
        approvals.push_back(proposer.clone()); // Proposer automatically approves

        let new_proposal = PendingProposal {
            id: proposal_id,
            proposer: proposer.clone(),
            action,
            approvals,
            executed: false,
            expiry: env.ledger().timestamp() + 86400, // 24 hours
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &new_proposal);

        env.storage()
            .persistent()
            .set(&DataKey::ProposalCounter, &(proposal_id + 1));

        env.events()
            .publish((symbol_short!("proposal"), proposal_id), proposer.clone());

        // Check if proposal can be executed immediately
        if let Some(multisig_config) = Self::get_multisig_config(env) {
            if new_proposal.approvals.len() >= multisig_config.required_signatures {
                Self::execute_proposal(env, proposal_id)?;
            }
        }

        Ok(proposal_id)
    }

    pub fn approve_proposal(
        env: &Env,
        approver: Address,
        proposal_id: u64,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &approver)?;

        let mut proposal: PendingProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(AccessControlError::InvalidAddress)?;

        if proposal.executed {
            return Err(AccessControlError::InvalidAddress);
        }

        if env.ledger().timestamp() > proposal.expiry {
            return Err(AccessControlError::InvalidAddress);
        }

        if proposal.approvals.contains(&approver) {
            return Err(AccessControlError::InvalidAddress);
        }

        proposal.approvals.push_back(approver.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((symbol_short!("approve"), proposal_id), approver.clone());

        if let Some(multisig_config) = Self::get_multisig_config(env) {
            if proposal.approvals.len() >= multisig_config.required_signatures {
                Self::execute_proposal(env, proposal_id)?;
            }
        }

        Ok(())
    }

    pub fn execute_proposal(env: &Env, proposal_id: u64) -> AccessControlResult<()> {
        let mut proposal: PendingProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(AccessControlError::InvalidAddress)?;

        if proposal.executed {
            return Err(AccessControlError::InvalidAddress);
        }

        if let Some(multisig_config) = Self::get_multisig_config(env) {
            if proposal.approvals.len() < multisig_config.required_signatures {
                return Err(AccessControlError::AdminRequired);
            }
        }

        proposal.executed = true;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        match proposal.action {
            ProposalAction::SetRole(user, role) => {
                Self::validate_role_assignment(env, &user, &role)?;
                let old_role = Self::get_role(env, user.clone());
                env.storage()
                    .persistent()
                    .set(&DataKey::UserRole(user.clone()), &role);

                env.events().publish(
                    (symbol_short!("role_set"), user.clone(), role.clone()),
                    (proposal.proposer.clone(), old_role),
                );
            }
            ProposalAction::UpdateConfig(config) => {
                env.storage().persistent().set(&DataKey::Config, &config);

                env.events().publish(
                    (symbol_short!("cfg_upd"), config.clone()),
                    proposal.proposer.clone(),
                );
            }
            ProposalAction::Pause => {
                env.storage().persistent().set(&DataKey::Paused, &true);

                env.events()
                    .publish((symbol_short!("paused"), true), proposal.proposer.clone());
            }
            ProposalAction::Unpause => {
                env.storage().persistent().set(&DataKey::Paused, &false);

                env.events().publish(
                    (symbol_short!("unpaused"), false),
                    proposal.proposer.clone(),
                );
            }
            _ => return Err(AccessControlError::InvalidAddress),
        }

        env.events().publish(
            (symbol_short!("executed"), proposal_id),
            proposal.proposer.clone(),
        );

        Ok(())
    }
}
