#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec};

pub mod access_control;
pub mod errors;
pub mod types;

#[cfg(test)]
mod access_control_tests;

pub use access_control::AccessControlModule;
pub use errors::{AccessControlError, AccessControlResult};
pub use types::{AccessControlConfig, MembershipInfo, MultiSigConfig, ProposalAction, UserRole};

#[contract]
pub struct AccessControl;

#[contractimpl]
impl AccessControl {
    pub fn initialize(env: Env, admin: Address) {
        AccessControlModule::initialize(&env, admin, None).unwrap()
    }

    pub fn set_role(env: Env, admin: Address, user: Address, role: UserRole) {
        AccessControlModule::set_role(&env, admin, user, role).unwrap()
    }

    pub fn get_role(env: Env, user: Address) -> UserRole {
        AccessControlModule::get_role(&env, user)
    }

    pub fn check_access(env: Env, user: Address, required_role: UserRole) -> bool {
        AccessControlModule::check_access(&env, user, required_role).unwrap_or(false)
    }

    pub fn require_access(env: Env, user: Address, required_role: UserRole) {
        AccessControlModule::require_access(&env, user, required_role).unwrap()
    }

    pub fn is_admin(env: Env, user: Address) -> bool {
        AccessControlModule::is_admin(&env, user)
    }

    pub fn remove_role(env: Env, admin: Address, user: Address) {
        AccessControlModule::remove_role(&env, admin, user).unwrap()
    }

    pub fn update_config(env: Env, admin: Address, config: AccessControlConfig) {
        AccessControlModule::update_config(&env, admin, config).unwrap()
    }

    pub fn get_config(env: Env) -> AccessControlConfig {
        AccessControlModule::get_config(&env)
    }

    pub fn pause(env: Env, admin: Address) {
        AccessControlModule::pause(&env, admin).unwrap()
    }

    pub fn unpause(env: Env, admin: Address) {
        AccessControlModule::unpause(&env, admin).unwrap()
    }

    pub fn blacklist_user(env: Env, admin: Address, user: Address) {
        AccessControlModule::blacklist_user(&env, admin, user).unwrap()
    }

    pub fn unblacklist_user(env: Env, admin: Address, user: Address) {
        AccessControlModule::unblacklist_user(&env, admin, user).unwrap()
    }

    pub fn is_blacklisted(env: Env, user: Address) -> bool {
        AccessControlModule::is_blacklisted(&env, &user)
    }

    pub fn propose_admin_transfer(env: Env, current_admin: Address, new_admin: Address) {
        AccessControlModule::propose_admin_transfer(&env, current_admin, new_admin).unwrap()
    }

    pub fn accept_admin_transfer(env: Env, new_admin: Address) {
        AccessControlModule::accept_admin_transfer(&env, new_admin).unwrap()
    }

    pub fn cancel_admin_transfer(env: Env, current_admin: Address) {
        AccessControlModule::cancel_admin_transfer(&env, current_admin).unwrap()
    }

    pub fn initialize_multisig(env: Env, admins: Vec<Address>, required_signatures: u32) {
        AccessControlModule::initialize_multisig(&env, admins, required_signatures, None).unwrap()
    }

    pub fn create_proposal(env: Env, proposer: Address, action: ProposalAction) -> u64 {
        AccessControlModule::create_proposal(&env, proposer, action).unwrap()
    }

    pub fn approve_proposal(env: Env, approver: Address, proposal_id: u64) {
        AccessControlModule::approve_proposal(&env, approver, proposal_id).unwrap()
    }

    pub fn is_multisig_enabled(env: Env) -> bool {
        AccessControlModule::is_multisig_enabled(&env)
    }

    pub fn get_multisig_admins(env: Env) -> Vec<Address> {
        AccessControlModule::get_multisig_config(&env)
            .map(|config| config.admins)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_multisig_threshold(env: Env) -> u32 {
        AccessControlModule::get_multisig_config(&env)
            .map(|config| config.required_signatures)
            .unwrap_or(0)
    }

    pub fn check_access_legacy(env: Env, caller: Address, required_role: String) -> bool {
        let admin_str = String::from_str(&env, "Admin");
        let member_str = String::from_str(&env, "Member");

        let role = if required_role == admin_str {
            UserRole::Admin
        } else if required_role == member_str {
            UserRole::Member
        } else {
            UserRole::Guest
        };
        AccessControlModule::check_access(&env, caller, role).unwrap_or(false)
    }
}
