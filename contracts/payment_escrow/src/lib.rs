#![no_std]
#![allow(deprecated)]

mod errors;
mod types;

// Uncomment once all functions are implemented (Issue #5):
// #[cfg(test)]
// mod test;

pub use errors::Error;
pub use types::{Escrow, EscrowStatus};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, String, Vec};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Contract administrator address.
    Admin,
    /// Address of the accepted payment token.
    PaymentToken,
    /// Default dispute window in seconds (applied to every new escrow).
    DefaultDisputeWindow,
    /// Escrow record keyed by escrow ID.
    Escrow(String),
    /// List of escrow IDs created by a depositor.
    DepositorEscrows(Address),
    /// List of escrow IDs where this address is the beneficiary.
    BeneficiaryEscrows(Address),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct PaymentEscrowContract;

#[contractimpl]
impl PaymentEscrowContract {
    // ── Internal helpers ──────────────────────────────────────────────────────

    fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin = Self::get_admin(env)?;
        if caller != &admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    fn get_payment_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .ok_or(Error::PaymentTokenNotSet)
    }

    fn get_dispute_window(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::DefaultDisputeWindow)
            .unwrap_or(0u64)
    }

    fn load_escrow(env: &Env, escrow_id: &String) -> Result<Escrow, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .ok_or(Error::EscrowNotFound)
    }

    fn save_escrow(env: &Env, escrow: &Escrow) {
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow.id.clone()), escrow);
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        payment_token: Address,
        dispute_window_secs: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.storage()
            .instance()
            .set(&DataKey::DefaultDisputeWindow, &dispute_window_secs);

        env.events().publish(
            (symbol_short!("init"),),
            (admin, payment_token, dispute_window_secs),
        );
        Ok(())
    }

    // ── Admin configuration ───────────────────────────────────────────────────

    /// Update the default dispute window. Applies to escrows created after
    /// this call; existing escrows keep their original window.
    pub fn set_dispute_window(
        env: Env,
        caller: Address,
        window_secs: u64,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage()
            .instance()
            .set(&DataKey::DefaultDisputeWindow, &window_secs);

        env.events().publish(
            (symbol_short!("dw_set"),),
            (window_secs,),
        );
        Ok(())
    }

    // ── Escrow creation ───────────────────────────────────────────────────────

    /// Lock funds in escrow.
    ///
    /// * `escrow_id`     — unique ID chosen by the caller (e.g. a UUID).
    /// * `beneficiary`   — address that receives funds on release.
    /// * `amount`        — tokens to lock (> 0).
    /// * `description`   — human-readable purpose.
    /// * `release_after` — Unix timestamp after which auto-claim is allowed
    ///                     (0 = auto-claim disabled; admin-only release).
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        escrow_id: String,
        beneficiary: Address,
        amount: i128,
        description: String,
        release_after: u64,
    ) -> Result<(), Error> {
        depositor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if env.storage().persistent().has(&DataKey::Escrow(escrow_id.clone())) {
            return Err(Error::EscrowAlreadyExists);
        }

        let payment_token = Self::get_payment_token(&env)?;
        let dispute_window = Self::get_dispute_window(&env);
        let now = env.ledger().timestamp();

        // Pull funds from depositor into the contract
        token::Client::new(&env, &payment_token).transfer(
            &depositor,
            env.current_contract_address(),
            &amount,
        );

        let escrow = Escrow {
            id: escrow_id.clone(),
            depositor: depositor.clone(),
            beneficiary: beneficiary.clone(),
            amount,
            payment_token,
            status: EscrowStatus::Pending,
            description,
            created_at: now,
            release_after,
            dispute_window,
            dispute_raised_at: None,
            resolved_at: None,
        };

        Self::save_escrow(&env, &escrow);

        // Index: depositor → escrow IDs
        let mut dep_list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::DepositorEscrows(depositor.clone()))
            .unwrap_or(Vec::new(&env));
        dep_list.push_back(escrow_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::DepositorEscrows(depositor.clone()), &dep_list);

        // Index: beneficiary → escrow IDs
        let mut ben_list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::BeneficiaryEscrows(beneficiary.clone()))
            .unwrap_or(Vec::new(&env));
        ben_list.push_back(escrow_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::BeneficiaryEscrows(beneficiary.clone()), &ben_list);

        env.events().publish(
            (symbol_short!("created"), escrow_id),
            (depositor, beneficiary, amount, release_after),
        );
        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Fetch an escrow record by ID.
    pub fn get_escrow(env: Env, escrow_id: String) -> Result<Escrow, Error> {
        Self::load_escrow(&env, &escrow_id)
    }

    /// Return all escrow IDs created by a depositor.
    pub fn get_depositor_escrows(env: Env, depositor: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::DepositorEscrows(depositor))
            .unwrap_or(Vec::new(&env))
    }

    /// Return all escrow IDs where the address is the beneficiary.
    pub fn get_beneficiary_escrows(env: Env, beneficiary: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::BeneficiaryEscrows(beneficiary))
            .unwrap_or(Vec::new(&env))
    }

    /// Return the current admin address.
    pub fn admin(env: Env) -> Result<Address, Error> {
        Self::get_admin(&env)
    }

    /// Return the accepted payment token address.
    pub fn payment_token(env: Env) -> Result<Address, Error> {
        Self::get_payment_token(&env)
    }

    /// Return the current default dispute window in seconds.
    pub fn dispute_window(env: Env) -> u64 {
        Self::get_dispute_window(&env)
    }
}
