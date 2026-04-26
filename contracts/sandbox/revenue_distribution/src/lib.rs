#![no_std]

mod errors;
mod types;

pub use errors::Error;
pub use types::{Beneficiary, Distribution};

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Beneficiaries,
    TotalShares,
    Distribution(String),
    DistributionList,
    Claimed(String, Address),
}

#[contract]
pub struct RevenueDistributionContract;

#[contractimpl]
impl RevenueDistributionContract {
    /// One-time setup: set admin and payment token.
    pub fn initialize(
        env: Env,
        admin: Address,
        payment_token: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        Ok(())
    }
}
