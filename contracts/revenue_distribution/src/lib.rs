#![no_std]

use soroban_sdk::{contract, contractimpl, contractmeta, contracttype, contracterror, Env, Address, Vec};

contractmeta!(key = "name", val = "revenue_distribution");
contractmeta!(key = "interface_version", val = "1");

/// Interface version reported by `version()`. Bump on any ABI change.
pub const VERSION: u32 = 1;

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
    Admin,
    PendingAdmin,
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
    /// `initialize` was already called.
    AlreadyInitialized = 10,
    /// The contract has no admin yet.
    NotInitialized = 11,
    /// There is no pending admin transfer.
    NoPendingAdmin = 12,
}

#[contract]
pub struct RevenueDistributionContract;

#[contractimpl]
impl RevenueDistributionContract {
    /// One-time setup: record the admin allowed to call `configure`.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Interface version of this contract; the backend checks it at startup.
    pub fn version(_env: Env) -> u32 {
        VERSION
    }

    /// Step one of an admin transfer: nominate `new_admin`.
    pub fn propose_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::PendingAdmin, &new_admin);
        Ok(())
    }

    /// Step two of an admin transfer: the nominee accepts.
    pub fn accept_admin(env: Env) -> Result<(), Error> {
        let pending: Address = env
            .storage()
            .instance()
            .get(&DataKey::PendingAdmin)
            .ok_or(Error::NoPendingAdmin)?;
        pending.require_auth();
        env.storage().instance().set(&DataKey::Admin, &pending);
        env.storage().instance().remove(&DataKey::PendingAdmin);
        Ok(())
    }

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
        // Authenticate the *stored* admin, never just the caller-supplied address.
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        stored.require_auth();

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

        let config = RevenueConfig { recipients, admin: stored };
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

#[cfg(test)]
mod admin_test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec};

    fn setup() -> (Env, RevenueDistributionContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(RevenueDistributionContract, ());
        let client = RevenueDistributionContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    fn split(env: &Env) -> Vec<Recipient> {
        vec![
            env,
            Recipient { address: Address::generate(env), basis_points: 6_000 },
            Recipient { address: Address::generate(env), basis_points: 4_000 },
        ]
    }

    #[test]
    fn a_second_caller_cannot_replace_the_configuration() {
        let (env, client, admin) = setup();
        client.configure(&admin, &split(&env));

        let attacker = Address::generate(&env);
        assert_eq!(
            client.try_configure(&attacker, &split(&env)),
            Err(Ok(Error::Unauthorized))
        );
    }

    #[test]
    fn configure_requires_initialize_first() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(RevenueDistributionContract, ());
        let client = RevenueDistributionContractClient::new(&env, &id);
        let anyone = Address::generate(&env);
        assert_eq!(
            client.try_configure(&anyone, &split(&env)),
            Err(Ok(Error::NotInitialized))
        );
    }

    #[test]
    fn admin_rotation_moves_configure_rights() {
        let (env, client, admin) = setup();
        let next = Address::generate(&env);
        client.propose_admin(&next);
        client.accept_admin();

        assert_eq!(
            client.try_configure(&admin, &split(&env)),
            Err(Ok(Error::Unauthorized))
        );
        client.configure(&next, &split(&env));
    }

    #[test]
    fn version_is_reported() {
        let (_, client, _) = setup();
        assert_eq!(client.version(), VERSION);
    }
}
