// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use soroban_sdk::{contracttype, symbol_short, Address, Env, IntoVal, Symbol, Vec};

use crate::errors::{AccessControlError, AccessControlResult};
use crate::types::{
    AccessControlConfig, MembershipInfo, MultiSigConfig, PendingAdminTransfer, PendingProposal,
    ProposalAction, ProposalStats, SubscriptionTierLevel, UserRole, UserSubscriptionStatus,
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
    // Tier-based access control keys
    UserTierLevel(Address),
    RequiredTierForRole(UserRole),
    // Enhanced multisig keys
    ProposalStats,
    PendingProposalsList,
    TimeLockExpiry(u64),
    EmergencyMode,
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
        env.events()
            .publish((symbol_short!("init"), admin.clone()), config.clone());

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

        // Validate no duplicate admins
        for i in 0..admins.len() {
            for j in (i + 1)..admins.len() {
                if admins.get(i).unwrap() == admins.get(j).unwrap() {
                    return Err(AccessControlError::DuplicateAdmin);
                }
            }
        }

        // Set reasonable defaults for thresholds
        let critical_threshold = (required_signatures + 1).min(admins.len());
        let emergency_threshold = (critical_threshold + 1).min(admins.len());

        let multisig_config = MultiSigConfig {
            admins: admins.clone(),
            required_signatures,
            critical_threshold,
            emergency_threshold,
            time_lock_duration: 86400, // 24 hours default
            max_pending_proposals: 50,
            proposal_expiry_duration: 604800, // 7 days default
        };

        if !multisig_config.validate() {
            return Err(AccessControlError::InvalidMultisigConfig);
        }

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

        // Initialize proposal stats
        let stats = ProposalStats {
            total_created: 0,
            total_executed: 0,
            total_rejected: 0,
            total_expired: 0,
            pending_count: 0,
        };
        env.storage()
            .persistent()
            .set(&DataKey::ProposalStats, &stats);

        // Initialize pending proposals list
        let pending_list: Vec<u64> = Vec::new(env);
        env.storage()
            .persistent()
            .set(&DataKey::PendingProposalsList, &pending_list);

        // Emit multisig initialization event
        env.events().publish(
            (symbol_short!("ms_init"), required_signatures),
            (admins.clone(), config.clone()),
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

        let multisig_config =
            Self::get_multisig_config(env).ok_or(AccessControlError::MultisigNotEnabled)?;

        // Check max pending proposals limit
        let mut stats: ProposalStats = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalStats)
            .unwrap_or(ProposalStats {
                total_created: 0,
                total_executed: 0,
                total_rejected: 0,
                total_expired: 0,
                pending_count: 0,
            });

        if stats.pending_count >= multisig_config.max_pending_proposals {
            return Err(AccessControlError::MaxProposalsReached);
        }

        let proposal_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalCounter)
            .unwrap_or(0);

        // Classify proposal type
        let proposal_type = action.classify_type();

        // Determine required signatures based on proposal type
        let required_signatures = multisig_config.get_required_signatures(&proposal_type);

        let mut approvals = Vec::new(env);
        approvals.push_back(proposer.clone()); // Proposer automatically approves

        let rejections = Vec::new(env);

        let current_time = env.ledger().timestamp();
        let expiry = current_time + multisig_config.proposal_expiry_duration;

        // Calculate time-lock if required
        let time_lock_until = if proposal_type.requires_time_lock() {
            Some(current_time + multisig_config.time_lock_duration)
        } else {
            None
        };

        let new_proposal = PendingProposal {
            id: proposal_id,
            proposer: proposer.clone(),
            action: action.clone(),
            proposal_type: proposal_type.clone(),
            approvals,
            rejections,
            executed: false,
            created_at: current_time,
            expiry,
            time_lock_until,
            required_signatures,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &new_proposal);

        env.storage()
            .persistent()
            .set(&DataKey::ProposalCounter, &(proposal_id + 1));

        // Add to pending proposals list
        let mut pending_list: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingProposalsList)
            .unwrap_or_else(|| Vec::new(env));
        pending_list.push_back(proposal_id);
        env.storage()
            .persistent()
            .set(&DataKey::PendingProposalsList, &pending_list);

        // Update stats
        stats.total_created += 1;
        stats.pending_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::ProposalStats, &stats);

        env.events().publish(
            (
                symbol_short!("proposal"),
                proposal_id,
                proposal_type.clone(),
            ),
            proposer.clone(),
        );

        // Check if proposal can be executed immediately (only for non-time-locked proposals)
        if time_lock_until.is_none() && new_proposal.approvals.len() >= required_signatures {
            Self::execute_proposal(env, proposal_id)?;
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
            .ok_or(AccessControlError::ProposalNotFound)?;

        if proposal.executed {
            return Err(AccessControlError::ProposalAlreadyExecuted);
        }

        if env.ledger().timestamp() > proposal.expiry {
            // Clean up expired proposal
            Self::cleanup_expired_proposal(env, proposal_id)?;
            return Err(AccessControlError::ProposalExpired);
        }

        if proposal.approvals.contains(&approver) {
            return Err(AccessControlError::AlreadyApproved);
        }

        if proposal.rejections.contains(&approver) {
            return Err(AccessControlError::AlreadyRejected);
        }

        proposal.approvals.push_back(approver.clone());

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((symbol_short!("approve"), proposal_id), approver.clone());

        // Check if we have enough approvals to execute
        let can_execute = proposal.approvals.len() >= proposal.required_signatures;

        // Check time-lock
        let time_lock_passed = if let Some(time_lock_until) = proposal.time_lock_until {
            env.ledger().timestamp() >= time_lock_until
        } else {
            true
        };

        if can_execute && time_lock_passed {
            Self::execute_proposal(env, proposal_id)?;
        }

        Ok(())
    }

    pub fn execute_proposal(env: &Env, proposal_id: u64) -> AccessControlResult<()> {
        let mut proposal: PendingProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(AccessControlError::ProposalNotFound)?;

        if proposal.executed {
            return Err(AccessControlError::ProposalAlreadyExecuted);
        }

        // Check if expired
        if env.ledger().timestamp() > proposal.expiry {
            Self::cleanup_expired_proposal(env, proposal_id)?;
            return Err(AccessControlError::ProposalExpired);
        }

        // Check if time-lock has passed
        if let Some(time_lock_until) = proposal.time_lock_until {
            if env.ledger().timestamp() < time_lock_until {
                return Err(AccessControlError::TimeLockActive);
            }
        }

        // Validate signatures
        if proposal.approvals.len() < proposal.required_signatures {
            return Err(AccessControlError::InsufficientApprovals);
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
            ProposalAction::UpdateMultisigConfig(new_config) => {
                if !new_config.validate() {
                    return Err(AccessControlError::InvalidMultisigConfig);
                }
                env.storage()
                    .persistent()
                    .set(&DataKey::MultiSigConfig, &new_config);

                env.events().publish(
                    (symbol_short!("ms_upd"), new_config.clone()),
                    proposal.proposer.clone(),
                );
            }
            ProposalAction::EmergencyPause(reason) => {
                env.storage().persistent().set(&DataKey::Paused, &true);
                env.storage()
                    .persistent()
                    .set(&DataKey::EmergencyMode, &true);

                env.events().publish(
                    (symbol_short!("emrg_pse"), reason),
                    proposal.proposer.clone(),
                );
            }
            ProposalAction::BatchBlacklist(users) => {
                for user in users.iter() {
                    env.storage()
                        .persistent()
                        .set(&DataKey::Blacklisted(user.clone()), &true);
                }

                env.events().publish(
                    (symbol_short!("batch_bl"), users.len()),
                    proposal.proposer.clone(),
                );
            }
            ProposalAction::AddAdmin(new_admin) => {
                if let Some(mut multisig_config) = Self::get_multisig_config(env) {
                    if multisig_config.admins.contains(&new_admin) {
                        return Err(AccessControlError::DuplicateAdmin);
                    }
                    multisig_config.admins.push_back(new_admin.clone());
                    env.storage()
                        .persistent()
                        .set(&DataKey::MultiSigConfig, &multisig_config);
                    env.storage()
                        .persistent()
                        .set(&DataKey::UserRole(new_admin.clone()), &UserRole::Admin);

                    env.events().publish(
                        (symbol_short!("add_adm"), new_admin),
                        proposal.proposer.clone(),
                    );
                }
            }
            ProposalAction::RemoveAdmin(admin_to_remove) => {
                if let Some(mut multisig_config) = Self::get_multisig_config(env) {
                    if multisig_config.admins.len() <= multisig_config.emergency_threshold {
                        return Err(AccessControlError::CannotRemoveLastAdmin);
                    }

                    let mut new_admins = Vec::new(env);
                    for admin in multisig_config.admins.iter() {
                        if admin != admin_to_remove {
                            new_admins.push_back(admin);
                        }
                    }
                    multisig_config.admins = new_admins;
                    env.storage()
                        .persistent()
                        .set(&DataKey::MultiSigConfig, &multisig_config);
                    env.storage().persistent().set(
                        &DataKey::UserRole(admin_to_remove.clone()),
                        &UserRole::Guest,
                    );

                    env.events().publish(
                        (symbol_short!("rm_adm"), admin_to_remove),
                        proposal.proposer.clone(),
                    );
                }
            }
            _ => return Err(AccessControlError::InvalidProposalType),
        }

        // Remove from pending list and update stats
        Self::remove_from_pending_list(env, proposal_id);
        let mut stats: ProposalStats = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalStats)
            .unwrap_or(ProposalStats {
                total_created: 0,
                total_executed: 0,
                total_rejected: 0,
                total_expired: 0,
                pending_count: 0,
            });
        stats.total_executed += 1;
        stats.pending_count = stats.pending_count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalStats, &stats);

        env.events().publish(
            (symbol_short!("executed"), proposal_id),
            proposal.proposer.clone(),
        );

        Ok(())
    }

    // ============================================================================
    // Enhanced Multisig Helper Functions
    // ============================================================================

    /// Reject a proposal (vote against it)
    pub fn reject_proposal(
        env: &Env,
        rejecter: Address,
        proposal_id: u64,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &rejecter)?;

        let mut proposal: PendingProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(AccessControlError::ProposalNotFound)?;

        if proposal.executed {
            return Err(AccessControlError::ProposalAlreadyExecuted);
        }

        if env.ledger().timestamp() > proposal.expiry {
            Self::cleanup_expired_proposal(env, proposal_id)?;
            return Err(AccessControlError::ProposalExpired);
        }

        if proposal.rejections.contains(&rejecter) {
            return Err(AccessControlError::AlreadyRejected);
        }

        if proposal.approvals.contains(&rejecter) {
            return Err(AccessControlError::AlreadyApproved);
        }

        proposal.rejections.push_back(rejecter.clone());

        // Check if rejection threshold reached (e.g., if more than 1/3 reject, proposal fails)
        let multisig_config =
            Self::get_multisig_config(env).ok_or(AccessControlError::MultisigNotEnabled)?;
        let rejection_threshold = (multisig_config.admins.len() / 3).max(1);

        if proposal.rejections.len() > rejection_threshold {
            // Proposal rejected - clean it up
            Self::remove_from_pending_list(env, proposal_id);
            env.storage()
                .persistent()
                .remove(&DataKey::Proposal(proposal_id));

            let mut stats: ProposalStats = env
                .storage()
                .persistent()
                .get(&DataKey::ProposalStats)
                .unwrap_or(ProposalStats {
                    total_created: 0,
                    total_executed: 0,
                    total_rejected: 0,
                    total_expired: 0,
                    pending_count: 0,
                });
            stats.total_rejected += 1;
            stats.pending_count = stats.pending_count.saturating_sub(1);
            env.storage()
                .persistent()
                .set(&DataKey::ProposalStats, &stats);

            env.events()
                .publish((symbol_short!("rejected"), proposal_id), rejecter.clone());

            return Err(AccessControlError::ProposalRejected);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);

        env.events()
            .publish((symbol_short!("reject"), proposal_id), rejecter.clone());

        Ok(())
    }

    /// Cancel a proposal (proposer only)
    pub fn cancel_proposal(
        env: &Env,
        proposer: Address,
        proposal_id: u64,
    ) -> AccessControlResult<()> {
        let proposal: PendingProposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(AccessControlError::ProposalNotFound)?;

        if proposal.proposer != proposer {
            return Err(AccessControlError::Unauthorized);
        }

        if proposal.executed {
            return Err(AccessControlError::ProposalAlreadyExecuted);
        }

        Self::remove_from_pending_list(env, proposal_id);
        env.storage()
            .persistent()
            .remove(&DataKey::Proposal(proposal_id));

        let mut stats: ProposalStats = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalStats)
            .unwrap_or(ProposalStats {
                total_created: 0,
                total_executed: 0,
                total_rejected: 0,
                total_expired: 0,
                pending_count: 0,
            });
        stats.pending_count = stats.pending_count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalStats, &stats);

        env.events()
            .publish((symbol_short!("cancelled"), proposal_id), proposer.clone());

        Ok(())
    }

    /// Get proposal details
    pub fn get_proposal(env: &Env, proposal_id: u64) -> Option<PendingProposal> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
    }

    /// Get all pending proposal IDs
    pub fn get_pending_proposals(env: &Env) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::PendingProposalsList)
            .unwrap_or_else(|| Vec::new(env))
    }

    /// Get proposal statistics
    pub fn get_proposal_stats(env: &Env) -> ProposalStats {
        env.storage()
            .persistent()
            .get(&DataKey::ProposalStats)
            .unwrap_or(ProposalStats {
                total_created: 0,
                total_executed: 0,
                total_rejected: 0,
                total_expired: 0,
                pending_count: 0,
            })
    }

    /// Clean up expired proposals (can be called by anyone)
    pub fn cleanup_expired_proposals(env: &Env) -> AccessControlResult<u32> {
        let pending_list: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingProposalsList)
            .unwrap_or_else(|| Vec::new(env));

        let current_time = env.ledger().timestamp();
        let mut cleaned_count = 0u32;

        for proposal_id in pending_list.iter() {
            if let Some(proposal) = env
                .storage()
                .persistent()
                .get::<DataKey, PendingProposal>(&DataKey::Proposal(proposal_id))
            {
                if current_time > proposal.expiry && !proposal.executed {
                    Self::cleanup_expired_proposal(env, proposal_id)?;
                    cleaned_count += 1;
                }
            }
        }

        Ok(cleaned_count)
    }

    fn cleanup_expired_proposal(env: &Env, proposal_id: u64) -> AccessControlResult<()> {
        Self::remove_from_pending_list(env, proposal_id);
        env.storage()
            .persistent()
            .remove(&DataKey::Proposal(proposal_id));

        let mut stats: ProposalStats = env
            .storage()
            .persistent()
            .get(&DataKey::ProposalStats)
            .unwrap_or(ProposalStats {
                total_created: 0,
                total_executed: 0,
                total_rejected: 0,
                total_expired: 0,
                pending_count: 0,
            });
        stats.total_expired += 1;
        stats.pending_count = stats.pending_count.saturating_sub(1);
        env.storage()
            .persistent()
            .set(&DataKey::ProposalStats, &stats);

        env.events()
            .publish((symbol_short!("expired"), proposal_id), ());

        Ok(())
    }

    fn remove_from_pending_list(env: &Env, proposal_id: u64) {
        let pending_list: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::PendingProposalsList)
            .unwrap_or_else(|| Vec::new(env));

        let mut new_list = Vec::new(env);
        for id in pending_list.iter() {
            if id != proposal_id {
                new_list.push_back(id);
            }
        }

        env.storage()
            .persistent()
            .set(&DataKey::PendingProposalsList, &new_list);
    }

    /// Update multisig configuration (requires proposal in multisig mode)
    pub fn update_multisig_config(
        env: &Env,
        caller: Address,
        new_config: MultiSigConfig,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        if !Self::is_multisig_enabled(env) {
            return Err(AccessControlError::MultisigNotEnabled);
        }

        if !new_config.validate() {
            return Err(AccessControlError::InvalidMultisigConfig);
        }

        // This should be done via proposal
        Err(AccessControlError::AdminRequired)
    }

    /// Check if emergency mode is active
    pub fn is_emergency_mode(env: &Env) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::EmergencyMode)
            .unwrap_or(false)
    }

    /// Deactivate emergency mode (requires proposal)
    pub fn deactivate_emergency_mode(env: &Env, caller: Address) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        if Self::is_multisig_enabled(env) {
            return Err(AccessControlError::AdminRequired);
        }

        env.storage()
            .persistent()
            .set(&DataKey::EmergencyMode, &false);

        env.events()
            .publish((symbol_short!("emrg_off"), false), caller.clone());

        Ok(())
    }

    // ============================================================================
    // Tier-Based Access Control Functions
    // ============================================================================

    /// Sets the subscription tier level for a user. Admin only.
    /// This is used for caching tier info to avoid cross-contract calls.
    pub fn set_user_tier(
        env: &Env,
        caller: Address,
        user: Address,
        tier_level: SubscriptionTierLevel,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        let old_tier = Self::get_user_tier(env, user.clone());
        env.storage()
            .persistent()
            .set(&DataKey::UserTierLevel(user.clone()), &tier_level);

        env.events().publish(
            (symbol_short!("tier_set"), user.clone(), tier_level.clone()),
            (caller.clone(), old_tier),
        );

        Ok(())
    }

    /// Gets the subscription tier level for a user.
    pub fn get_user_tier(env: &Env, user: Address) -> SubscriptionTierLevel {
        env.storage()
            .persistent()
            .get(&DataKey::UserTierLevel(user))
            .unwrap_or(SubscriptionTierLevel::Free)
    }

    /// Sets the required tier for a specific role. Admin only.
    pub fn set_required_tier_for_role(
        env: &Env,
        caller: Address,
        role: UserRole,
        required_tier: SubscriptionTierLevel,
    ) -> AccessControlResult<()> {
        Self::require_admin(env, &caller)?;

        env.storage()
            .persistent()
            .set(&DataKey::RequiredTierForRole(role.clone()), &required_tier);

        env.events().publish(
            (
                symbol_short!("tier_req"),
                role.clone(),
                required_tier.clone(),
            ),
            caller.clone(),
        );

        Ok(())
    }

    /// Gets the required tier for a specific role.
    pub fn get_required_tier_for_role(env: &Env, role: UserRole) -> SubscriptionTierLevel {
        env.storage()
            .persistent()
            .get(&DataKey::RequiredTierForRole(role))
            .unwrap_or(SubscriptionTierLevel::Free)
    }

    /// Checks if a user has the required tier level.
    pub fn check_tier_access(
        env: &Env,
        user: Address,
        required_tier: SubscriptionTierLevel,
    ) -> AccessControlResult<bool> {
        Self::require_initialized(env)?;
        Self::require_not_paused(env)?;

        if Self::is_blacklisted(env, &user) {
            return Ok(false);
        }

        let user_tier = Self::get_user_tier(env, user.clone());
        let has_access = user_tier.has_tier_access(&required_tier);

        env.events().publish(
            (
                symbol_short!("tier_chk"),
                user.clone(),
                required_tier.clone(),
            ),
            has_access,
        );

        Ok(has_access)
    }

    /// Requires that a user has the specified tier level.
    pub fn require_tier_access(
        env: &Env,
        user: Address,
        required_tier: SubscriptionTierLevel,
    ) -> AccessControlResult<()> {
        if !Self::check_tier_access(env, user, required_tier)? {
            return Err(AccessControlError::InsufficientRole);
        }
        Ok(())
    }

    /// Checks combined role and tier access.
    /// User must have both the required role AND the required tier.
    pub fn check_role_and_tier_access(
        env: &Env,
        user: Address,
        required_role: UserRole,
        required_tier: SubscriptionTierLevel,
    ) -> AccessControlResult<bool> {
        let has_role_access = Self::check_access(env, user.clone(), required_role)?;
        if !has_role_access {
            return Ok(false);
        }

        let has_tier_access = Self::check_tier_access(env, user, required_tier)?;
        Ok(has_tier_access)
    }

    /// Requires combined role and tier access.
    pub fn require_role_and_tier_access(
        env: &Env,
        user: Address,
        required_role: UserRole,
        required_tier: SubscriptionTierLevel,
    ) -> AccessControlResult<()> {
        if !Self::check_role_and_tier_access(env, user, required_role, required_tier)? {
            return Err(AccessControlError::InsufficientRole);
        }
        Ok(())
    }

    /// Validates that a user's tier meets the requirements for their role.
    pub fn validate_tier_for_role(
        env: &Env,
        user: Address,
        role: UserRole,
    ) -> AccessControlResult<bool> {
        let config = Self::get_config(env);

        if !config.enforce_tier_restrictions {
            return Ok(true);
        }

        let required_tier = Self::get_required_tier_for_role(env, role);
        let user_tier = Self::get_user_tier(env, user);

        Ok(user_tier.has_tier_access(&required_tier))
    }

    /// Gets the full subscription status for a user.
    /// Returns cached tier info or fetches from subscription contract if configured.
    pub fn get_user_subscription_status(env: &Env, user: Address) -> UserSubscriptionStatus {
        let tier_level = Self::get_user_tier(env, user);

        // Return basic status based on cached tier level
        // In a full implementation, this would call the subscription contract
        UserSubscriptionStatus {
            tier_level,
            is_active: true, // Would be fetched from subscription contract
            expires_at: 0,   // Would be fetched from subscription contract
        }
    }
}
