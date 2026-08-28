#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Env, Address, Vec};

/// Total basis points a valid configuration must sum to (100.00%).
/// Mirrors the off-chain `TOTAL_BASIS_POINTS` constant and the
/// `RevenueSplitRecipientDto` validation rule (sum == 10 000).
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
    /// Set the distribution configuration.
    ///
    /// Requires admin authorization. Rejects if basis_points don't sum to
    /// exactly `TOTAL_BASIS_POINTS` (10 000), matching the off-chain
    /// `RevenueSplitRecipientDto` validation rule from BE-143.
    ///
    /// CT-57: configure entrypoint with basis-point sum validation.
    pub fn configure(
        env: Env,
        admin: Address,
        recipients: Vec<Recipient>,
    ) -> Result<(), Error> {
        admin.require_auth();

        if recipients.is_empty() {
            return Err(Error::EmptyRecipients);
        }

        // Validate that basis points sum to exactly TOTAL_BASIS_POINTS.
        let mut total: u32 = 0;
        for r in recipients.iter() {
            total = total.checked_add(r.basis_points).ok_or(Error::ArithmeticOverflow)?;
        }
        if total != TOTAL_BASIS_POINTS {
            return Err(Error::InvalidBasisPoints);
        }

        let config = RevenueConfig { recipients, admin };
        env.storage().persistent().set(&DataKey::Config, &config);
        Ok(())
    }

    /// Return the current distribution configuration, if any.
    pub fn get_config(env: Env) -> Result<RevenueConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::NotConfigured)
    }
}
