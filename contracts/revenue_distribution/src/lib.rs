#![no_std]

mod beneficiary_limit;
mod beneficiary_validation;

use soroban_sdk::{
    contract, contracterror, contractimpl, contractmeta, contracttype, symbol_short, token, Address,
    Env, Symbol, Vec,
};

contractmeta!(key = "name", val = "revenue_distribution");
contractmeta!(key = "interface_version", val = "2");

/// Interface version reported by `version()`. Bump on any ABI change.
pub const VERSION: u32 = 2;

/// Total basis points a valid configuration must sum to (100.00%).
/// Mirrors the off-chain `TOTAL_BASIS_POINTS` constant and the
/// `RevenueSplitRecipientDto` validation rule (sum == 10 000).
pub const TOTAL_BASIS_POINTS: u32 = 10_000;

/// Ledgers in a day at ~5 s per ledger.
const DAY_IN_LEDGERS: u32 = 17_280;
/// Extend the config TTL when it falls below 30 days...
const TTL_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
/// ...to 60 days.
const TTL_EXTEND_TO: u32 = 60 * DAY_IN_LEDGERS;

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
}

#[contracttype]
pub enum DataKey {
    Config,
    Admin,
    PendingAdmin,
    ConfigVersion,
    PaymentToken(Address),
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
    /// A recipient has a zero share.
    InvalidShare = 6,
    /// The amount to distribute must be positive.
    InvalidAmount = 7,
    /// Token is not in the admin-managed allow-list.
    TokenNotAllowed = 8,
    /// More than `beneficiary_limit::MAX_BENEFICIARIES` recipients were supplied.
    TooManyBeneficiaries = 9,
    /// The same address appears in more than one recipient entry.
    DuplicateBeneficiary = 13,
}

#[contract]
pub struct RevenueDistributionContract;

fn bump_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    env.storage()
        .persistent()
        .extend_ttl(&DataKey::Config, TTL_THRESHOLD, TTL_EXTEND_TO);
    if env.storage().persistent().has(&DataKey::ConfigVersion) {
        env.storage().persistent().extend_ttl(
            &DataKey::ConfigVersion,
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }
}

/// Largest-remainder allocation of `amount` across `recipients` in integer
/// arithmetic. The shares always sum to `amount`; ties go to the earliest
/// recipient so the result is deterministic.
pub fn allocate(env: &Env, recipients: &Vec<Recipient>, amount: i128) -> Result<Vec<i128>, Error> {
    let total = TOTAL_BASIS_POINTS as i128;
    let mut shares: Vec<i128> = Vec::new(env);
    let mut remainders: Vec<i128> = Vec::new(env);
    let mut allocated: i128 = 0;

    for r in recipients.iter() {
        let product = amount
            .checked_mul(r.basis_points as i128)
            .ok_or(Error::ArithmeticOverflow)?;
        let base = product / total;
        shares.push_back(base);
        remainders.push_back(product % total);
        allocated = allocated
            .checked_add(base)
            .ok_or(Error::ArithmeticOverflow)?;
    }

    let mut leftover = amount
        .checked_sub(allocated)
        .ok_or(Error::ArithmeticOverflow)?;
    while leftover > 0 {
        let mut best: u32 = 0;
        let mut best_rem: i128 = -1;
        for i in 0..remainders.len() {
            let rem = remainders.get(i).unwrap();
            if rem > best_rem {
                best_rem = rem;
                best = i;
            }
        }
        let bumped = shares
            .get(best)
            .unwrap()
            .checked_add(1)
            .ok_or(Error::ArithmeticOverflow)?;
        shares.set(best, bumped);
        remainders.set(best, -1);
        leftover -= 1;
    }
    Ok(shares)
}

#[contractimpl]
impl RevenueDistributionContract {
    /// Deploy-time setup: the admin is stored atomically with the contract
    /// instance, so no later caller can front-run it.
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Compatibility no-op for deployment scripts that still call
    /// `initialize`. The admin is fixed by the constructor; only that stored
    /// address may call this entrypoint.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored != admin {
            return Err(Error::Unauthorized);
        }
        stored.require_auth();
        Ok(())
    }

    /// The admin recorded at deploy time.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
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
        env.storage()
            .instance()
            .set(&DataKey::PendingAdmin, &new_admin);
        env.events().publish(
            (symbol_short!("admin"), symbol_short!("proposed")),
            (admin, new_admin),
        );
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
        let previous: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        env.storage().instance().set(&DataKey::Admin, &pending);
        env.storage().instance().remove(&DataKey::PendingAdmin);
        env.events().publish(
            (symbol_short!("admin"), symbol_short!("changed")),
            (previous, pending),
        );
        Ok(())
    }

    /// Cancel a pending admin transfer. Current admin only.
    pub fn cancel_admin_transfer(env: Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        if !env.storage().instance().has(&DataKey::PendingAdmin) {
            return Err(Error::NoPendingAdmin);
        }
        env.storage().instance().remove(&DataKey::PendingAdmin);
        env.events().publish(
            (symbol_short!("admin"), symbol_short!("canceled")),
            admin,
        );
        Ok(())
    }

    /// Manage the allow-list of tokens accepted by `distribute`.
    pub fn set_payment_token(env: Env, token: Address, allowed: bool) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        let key = DataKey::PaymentToken(token.clone());
        let was = env.storage().instance().has(&key);
        if allowed && !was {
            env.storage().instance().set(&key, &true);
            env.events().publish(
                (symbol_short!("token"), symbol_short!("allowed")),
                (admin, token),
            );
        } else if !allowed && was {
            env.storage().instance().remove(&key);
            env.events().publish(
                (symbol_short!("token"), symbol_short!("removed")),
                (admin, token),
            );
        }
        Ok(())
    }

    /// Set the distribution configuration.
    ///
    /// Requires admin authorization. Rejects if basis_points don't sum to
    /// exactly `TOTAL_BASIS_POINTS` (10 000), matching the off-chain
    /// `RevenueSplitRecipientDto` validation rule from BE-143, and rejects
    /// recipients with a zero share.
    ///
    /// CT-57: configure entrypoint with basis-point sum validation.
    pub fn configure(env: Env, admin: Address, recipients: Vec<Recipient>) -> Result<(), Error> {
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
        if !beneficiary_limit::within_beneficiary_cap(recipients.len()) {
            return Err(Error::TooManyBeneficiaries);
        }
        if beneficiary_validation::has_duplicate_addresses(&recipients) {
            return Err(Error::DuplicateBeneficiary);
        }

        // Validate that basis points sum to exactly TOTAL_BASIS_POINTS.
        let mut total: u32 = 0;
        for r in recipients.iter() {
            if r.basis_points == 0 {
                return Err(Error::InvalidShare);
            }
            total = total
                .checked_add(r.basis_points)
                .ok_or(Error::ArithmeticOverflow)?;
        }
        if total != TOTAL_BASIS_POINTS {
            return Err(Error::InvalidBasisPoints);
        }

        let previous: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::ConfigVersion)
            .unwrap_or(0);
        let version = previous.checked_add(1).ok_or(Error::ArithmeticOverflow)?;

        let config = RevenueConfig { recipients };
        env.storage().persistent().set(&DataKey::Config, &config);
        env.storage()
            .persistent()
            .set(&DataKey::ConfigVersion, &version);
        bump_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "config_updated"), version),
            (previous, admin),
        );
        Ok(())
    }

    /// Return the current distribution configuration, if any.
    pub fn get_config(env: Env) -> Result<RevenueConfig, Error> {
        let config: RevenueConfig = env
            .storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::NotConfigured)?;
        bump_ttl(&env);
        Ok(config)
    }

    /// Monotonically increasing number of successful `configure` calls.
    pub fn get_config_version(env: Env) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::ConfigVersion)
            .unwrap_or(0)
    }

    /// Split `amount` of `token` from `from` across the configured recipients
    /// using largest-remainder allocation, and return each recipient's share.
    pub fn distribute(
        env: Env,
        token: Address,
        from: Address,
        amount: i128,
    ) -> Result<Vec<i128>, Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if !env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::PaymentToken(token.clone()))
            .unwrap_or(false)
        {
            return Err(Error::TokenNotAllowed);
        }
        let config: RevenueConfig = env
            .storage()
            .persistent()
            .get(&DataKey::Config)
            .ok_or(Error::NotConfigured)?;
        bump_ttl(&env);

        let shares = allocate(&env, &config.recipients, amount)?;
        let client = token::Client::new(&env, &token);
        for i in 0..shares.len() {
            let share = shares.get(i).unwrap();
            if share > 0 {
                let recipient = config.recipients.get(i).unwrap();
                client.transfer(&from, &recipient.address, &share);
            }
        }

        env.events()
            .publish((Symbol::new(&env, "distributed"), token), (from, amount));
        Ok(shares)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Events as _},
        vec,
    };

    fn setup() -> (Env, RevenueDistributionContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let id = env.register(
            RevenueDistributionContract,
            RevenueDistributionContractArgs::__constructor(&admin,),
        );
        let client = RevenueDistributionContractClient::new(&env, &id);
        (env, client, admin)
    }

    fn recipients(env: &Env, bps: &[u32]) -> Vec<Recipient> {
        let mut out = Vec::new(env);
        for b in bps {
            out.push_back(Recipient {
                address: Address::generate(env),
                basis_points: *b,
            });
        }
        out
    }

    #[test]
    fn zero_share_recipient_is_rejected() {
        let (env, client, admin) = setup();
        let r = recipients(&env, &[0, 10_000]);
        assert_eq!(
            client.try_configure(&admin, &r),
            Err(Ok(Error::InvalidShare))
        );
    }

    #[test]
    fn too_many_beneficiaries_are_rejected() {
        let (env, client, admin) = setup();
        let mut r = Vec::new(&env);
        for i in 0..=beneficiary_limit::MAX_BENEFICIARIES {
            r.push_back(Recipient {
                address: Address::generate(&env),
                basis_points: if i == beneficiary_limit::MAX_BENEFICIARIES {
                    TOTAL_BASIS_POINTS - beneficiary_limit::MAX_BENEFICIARIES
                } else {
                    1
                },
            });
        }
        assert_eq!(
            client.try_configure(&admin, &r),
            Err(Ok(Error::TooManyBeneficiaries))
        );
    }

    #[test]
    fn exactly_max_beneficiaries_is_accepted() {
        let (env, client, admin) = setup();
        let mut r = Vec::new(&env);
        let last = beneficiary_limit::MAX_BENEFICIARIES - 1;
        for i in 0..=last {
            r.push_back(Recipient {
                address: Address::generate(&env),
                basis_points: if i == last {
                    TOTAL_BASIS_POINTS - last
                } else {
                    1
                },
            });
        }
        client.configure(&admin, &r);
        assert_eq!(
            client.get_config().recipients.len(),
            beneficiary_limit::MAX_BENEFICIARIES
        );
    }

    #[test]
    fn duplicate_beneficiary_addresses_are_rejected() {
        let (env, client, admin) = setup();
        let shared = Address::generate(&env);
        let r = vec![
            &env,
            Recipient {
                address: shared.clone(),
                basis_points: 5_000,
            },
            Recipient {
                address: shared,
                basis_points: 5_000,
            },
        ];
        assert_eq!(
            client.try_configure(&admin, &r),
            Err(Ok(Error::DuplicateBeneficiary))
        );
    }

    #[test]
    fn configure_bumps_version_and_emits_an_event() {
        let (env, client, admin) = setup();
        assert_eq!(client.get_config_version(), 0);
        client.configure(&admin, &recipients(&env, &[6_000, 4_000]));
        assert_eq!(client.get_config_version(), 1);
        client.configure(&admin, &recipients(&env, &[5_000, 5_000]));
        assert!(!env.events().all().is_empty());
        assert_eq!(client.get_config_version(), 2);
    }

    #[test]
    fn config_survives_a_ledger_advance() {
        use soroban_sdk::testutils::Ledger;
        let (env, client, admin) = setup();
        client.configure(&admin, &recipients(&env, &[6_000, 4_000]));
        env.ledger()
            .with_mut(|l| l.sequence_number += 10 * DAY_IN_LEDGERS);
        assert_eq!(client.get_config().recipients.len(), 2);
    }

    #[test]
    fn allocation_preserves_the_total_and_is_deterministic() {
        let env = Env::default();
        let r = recipients(&env, &[3_333, 3_333, 3_334]);
        for amount in 0..500i128 {
            let first = allocate(&env, &r, amount).unwrap();
            let second = allocate(&env, &r, amount).unwrap();
            assert_eq!(first, second);
            let mut sum = 0i128;
            for s in first.iter() {
                assert!(s >= 0);
                sum += s;
            }
            assert_eq!(sum, amount);
        }
    }

    #[test]
    fn distribute_pays_each_recipient_its_share() {
        let (env, client, admin) = setup();
        let r = recipients(&env, &[2_500, 7_500]);
        client.configure(&admin, &r);

        let payer = Address::generate(&env);
        let token_admin = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(token_admin);
        let token_addr = sac.address();
        token::StellarAssetClient::new(&env, &token_addr).mint(&payer, &1_000);
        client.set_payment_token(&token_addr, &true);

        let shares = client.distribute(&token_addr, &payer, &1_000);
        assert_eq!(shares, vec![&env, 250i128, 750i128]);
        let t = token::Client::new(&env, &token_addr);
        assert_eq!(t.balance(&r.get(0).unwrap().address), 250);
        assert_eq!(t.balance(&r.get(1).unwrap().address), 750);
        assert_eq!(t.balance(&payer), 0);
    }

    #[test]
    fn distribute_rejects_unapproved_token() {
        let (env, client, admin) = setup();
        let r = recipients(&env, &[10_000]);
        client.configure(&admin, &r);

        let payer = Address::generate(&env);
        let token_addr = env
            .register_stellar_asset_contract_v2(Address::generate(&env))
            .address();
        token::StellarAssetClient::new(&env, &token_addr).mint(&payer, &1_000);

        assert_eq!(
            client.try_distribute(&token_addr, &payer, &1_000),
            Err(Ok(Error::TokenNotAllowed))
        );
    }
}

#[cfg(test)]
mod admin_test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec};

    fn setup() -> (Env, RevenueDistributionContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let id = env.register(
            RevenueDistributionContract,
            RevenueDistributionContractArgs::__constructor(&admin,),
        );
        let client = RevenueDistributionContractClient::new(&env, &id);
        (env, client, admin)
    }

    fn split(env: &Env) -> Vec<Recipient> {
        vec![
            env,
            Recipient {
                address: Address::generate(env),
                basis_points: 6_000,
            },
            Recipient {
                address: Address::generate(env),
                basis_points: 4_000,
            },
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
    fn non_deployer_cannot_initialize() {
        let (env, client, admin) = setup();
        let attacker = Address::generate(&env);
        assert_eq!(
            client.try_initialize(&attacker),
            Err(Ok(Error::Unauthorized))
        );
        assert_eq!(client.get_admin(), admin);
        client.configure(&admin, &split(&env));
    }

    #[test]
    fn initialize_is_a_no_op_for_the_stored_admin() {
        let (_, client, admin) = setup();
        client.initialize(&admin);
        assert_eq!(client.get_admin(), admin);
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
        assert_eq!(client.get_admin(), next);
    }

    #[test]
    fn admin_transfer_can_be_canceled() {
        let (env, client, admin) = setup();
        let next = Address::generate(&env);
        client.propose_admin(&next);
        client.cancel_admin_transfer();
        assert_eq!(client.try_accept_admin(), Err(Ok(Error::NoPendingAdmin)));
        assert_eq!(
            client.try_cancel_admin_transfer(),
            Err(Ok(Error::NoPendingAdmin))
        );
        client.configure(&admin, &split(&env));
    }

    #[test]
    fn version_is_reported() {
        let (_, client, _) = setup();
        assert_eq!(client.version(), VERSION);
    }
}
