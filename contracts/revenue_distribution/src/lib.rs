#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, vec, Env, Address, Vec};

/// Total basis points a valid configuration must sum to (100.00%).
pub const TOTAL_BASIS_POINTS: u32 = 10_000;

/// A single recipient and their share in basis points.
/// Mirrors the off-chain `RevenueSplitRecipientDto`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Recipient {
    pub address: Address,
    pub basis_points: u32,
}

/// The stored distribution configuration.
/// Mirrors the off-chain `RevenueSplitConfig`.
#[contracttype]
#[derive(Clone, Debug)]
pub struct RevenueConfig {
    pub recipients: Vec<Recipient>,
    pub admin: Address,
}

#[contracttype]
pub enum DataKey {
    Config,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// basis_points do not sum to exactly 10 000.
    InvalidBasisPoints = 1,
    /// No configuration has been set.
    NotConfigured = 2,
    /// Caller is not the admin.
    Unauthorized = 3,
    /// Recipient list is empty.
    EmptyRecipients = 4,
    /// Arithmetic overflow.
    ArithmeticOverflow = 5,
}

#[contract]
pub struct RevenueDistributionContract;

#[contractimpl]
impl RevenueDistributionContract {
    /// Return the current distribution configuration, if any.
    pub fn get_config(env: Env) -> Result<RevenueConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::NotConfigured)
    }
}
