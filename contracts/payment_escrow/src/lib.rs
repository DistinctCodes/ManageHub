#![no_std]
#![allow(deprecated)]

mod errors;
mod types;

pub use errors::Error;
pub use types::{Escrow, EscrowStatus};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

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

    /// One-time setup.
    ///
    /// * `admin`               — contract administrator.
    /// * `payment_token`       — the only accepted token for all escrows.
    /// * `dispute_window_secs` — seconds after escrow creation during which
    ///                           the depositor may raise a dispute (0 = disabled).
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

    // ── Queries ───────────────────────────────────────────────────────────────

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
