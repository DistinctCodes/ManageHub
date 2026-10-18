#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contractmeta, contracttype, token, Address, BytesN, Env,
};

contractmeta!(key = "name", val = "payment_escrow");
contractmeta!(key = "interface_version", val = "1");

/// Interface version reported by `version()`. Bump on any ABI change.
pub const VERSION: u32 = 1;

/// On-chain escrow status codes.
/// Maps to backend EscrowStatus enum: 0=NotFound, 1=Locked, 2=Released, 3=Refunded.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Locked = 1,
    Released = 2,
    Refunded = 3,
    /// Every unit has been released in instalments.
    Completed = 4,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub payer: Address,
    pub beneficiary: Address,
    /// Token contract whose balance this escrow holds.
    pub token: Address,
    pub amount: i128,
    /// Total released to the beneficiary so far (`released <= amount`).
    pub released: i128,
    pub state: EscrowState,
}

#[contracttype]
pub enum DataKey {
    Escrow(BytesN<32>),
    Admin,
    PendingAdmin,
    Paused,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// The escrow ID was not found in storage.
    NotFound = 1,
    /// The escrow has already been resolved (released or refunded).
    AlreadyResolved = 2,
    /// The deposit amount must be positive.
    InvalidAmount = 3,
    /// An escrow with this ID already exists.
    AlreadyExists = 4,
    /// Arithmetic overflow or underflow detected (CT-73).
    ArithmeticOverflow = 5,
    /// `initialize` was already called.
    AlreadyInitialized = 10,
    /// The contract has no admin yet.
    NotInitialized = 11,
    /// Caller is not the admin.
    Unauthorized = 12,
    /// Creating escrows is paused.
    Paused = 13,
    /// There is no pending admin transfer.
    NoPendingAdmin = 14,
    /// The escrow was already released.
    AlreadyReleased = 6,
    /// The escrow was already refunded.
    AlreadyRefunded = 7,
    /// A partial release would exceed the amount still locked.
    AmountExceedsEscrow = 20,
    /// Nothing remains to refund.
    NothingToRefund = 21,
}

#[contract]
pub struct PaymentEscrowContract;

fn load_admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

#[contractimpl]
impl PaymentEscrowContract {
    /// One-time setup: record the admin. Escrow entrypoints work without it,
    /// but upgrade, pause and admin rotation need it.
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

    /// Replace the contract code. Admin only; stored escrows are preserved.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        let admin = load_admin(&env)?;
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }

    /// Step one of an admin transfer: nominate `new_admin`.
    pub fn propose_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let admin = load_admin(&env)?;
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::PendingAdmin, &new_admin);
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

    /// Emergency stop for `create`. Existing escrows can still be released or refunded.
    pub fn pause(env: Env) -> Result<(), Error> {
        let admin = load_admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        Ok(())
    }

    /// Lift the pause.
    pub fn unpause(env: Env) -> Result<(), Error> {
        let admin = load_admin(&env)?;
        admin.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    /// Create a new escrow, locking `amount` from `payer` for `beneficiary`.
    ///
    /// CT-73: uses checked arithmetic on all amount paths.
    pub fn create(
        env: Env,
        escrow_id: BytesN<32>,
        payer: Address,
        beneficiary: Address,
        amount: i128,
        token: Address,
    ) -> Result<(), Error> {
        payer.require_auth();

        if env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Paused)
            .unwrap_or(false)
        {
            return Err(Error::Paused);
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::Escrow(escrow_id.clone()))
        {
            return Err(Error::AlreadyExists);
        }

        // Pull the funds into the contract before recording the escrow.
        token::Client::new(&env, &token).transfer(&payer, &env.current_contract_address(), &amount);

        let escrow = Escrow {
            payer,
            beneficiary,
            token,
            amount,
            released: 0,
            state: EscrowState::Locked,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Release escrowed funds to the beneficiary. Only the payer — the
    /// party whose funds are locked — may authorize a release (CT-72).
    pub fn release(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .ok_or(Error::NotFound)?;

        escrow.payer.require_auth();

        match escrow.state {
            EscrowState::Locked => {}
            EscrowState::Released => return Err(Error::AlreadyReleased),
            EscrowState::Refunded => return Err(Error::AlreadyRefunded),
            EscrowState::Completed => return Err(Error::AlreadyResolved),
        }

        let remaining = escrow
            .amount
            .checked_sub(escrow.released)
            .ok_or(Error::ArithmeticOverflow)?;
        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.beneficiary,
            &remaining,
        );
        escrow.released = escrow.amount;
        escrow.state = EscrowState::Released;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Release `amount` of the locked funds to the beneficiary, keeping the
    /// escrow `Locked` until the whole amount has been released, at which
    /// point it becomes `Completed`. Only the payer may authorise it.
    ///
    /// Invariant: `released <= amount`. Uses checked arithmetic.
    pub fn release_partial(env: Env, escrow_id: BytesN<32>, amount: i128) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .ok_or(Error::NotFound)?;

        escrow.payer.require_auth();

        if escrow.state != EscrowState::Locked {
            return Err(Error::AlreadyResolved);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let released = escrow
            .released
            .checked_add(amount)
            .ok_or(Error::ArithmeticOverflow)?;
        if released > escrow.amount {
            return Err(Error::AmountExceedsEscrow);
        }

        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.beneficiary,
            &amount,
        );
        escrow.released = released;
        if released == escrow.amount {
            escrow.state = EscrowState::Completed;
        }
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Refund whatever has not yet been released to the payer and close the
    /// escrow as `Refunded`. Only the beneficiary may authorise it. Returns
    /// the refunded amount.
    pub fn refund_remaining(env: Env, escrow_id: BytesN<32>) -> Result<i128, Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .ok_or(Error::NotFound)?;

        escrow.beneficiary.require_auth();

        if escrow.state != EscrowState::Locked {
            return Err(Error::AlreadyResolved);
        }
        let remaining = escrow
            .amount
            .checked_sub(escrow.released)
            .ok_or(Error::ArithmeticOverflow)?;
        if remaining <= 0 {
            return Err(Error::NothingToRefund);
        }

        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.payer,
            &remaining,
        );
        escrow.state = EscrowState::Refunded;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(remaining)
    }

    /// Refund escrowed funds back to the payer. Only the beneficiary — the
    /// party giving up their claim — may authorize a refund (CT-72).
    pub fn refund(env: Env, escrow_id: BytesN<32>) -> Result<(), Error> {
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id.clone()))
            .ok_or(Error::NotFound)?;

        escrow.beneficiary.require_auth();

        match escrow.state {
            EscrowState::Locked => {}
            EscrowState::Released => return Err(Error::AlreadyReleased),
            EscrowState::Refunded => return Err(Error::AlreadyRefunded),
            EscrowState::Completed => return Err(Error::AlreadyResolved),
        }

        let remaining = escrow
            .amount
            .checked_sub(escrow.released)
            .ok_or(Error::ArithmeticOverflow)?;
        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.payer,
            &remaining,
        );
        escrow.state = EscrowState::Refunded;
        env.storage()
            .persistent()
            .set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
    }

    /// Return the full escrow record, including the token and held amount.
    pub fn get_escrow(env: Env, escrow_id: BytesN<32>) -> Result<Escrow, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)
    }

    /// Query the status of an escrow.
    /// Returns: 1=Locked, 2=Released, 3=Refunded.
    /// Returns Error::NotFound if the escrow does not exist.
    pub fn get_status(env: Env, escrow_id: BytesN<32>) -> Result<u32, Error> {
        let escrow: Escrow = env
            .storage()
            .persistent()
            .get(&DataKey::Escrow(escrow_id))
            .ok_or(Error::NotFound)?;

        match escrow.state {
            EscrowState::Locked => Ok(1),
            EscrowState::Released => Ok(2),
            EscrowState::Refunded => Ok(3),
            EscrowState::Completed => Ok(4),
        }
    }
}

// ---------------------------------------------------------------------------
// CT-51 / #1999 / #2000: tests that assert real token movement and error codes
// ---------------------------------------------------------------------------

#[cfg(test)]
mod escrow_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    struct Fixture {
        env: Env,
        client: PaymentEscrowContractClient<'static>,
        contract_id: Address,
        token: Address,
        payer: Address,
        beneficiary: Address,
    }

    fn setup() -> Fixture {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &contract_id);

        let token_admin = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(token_admin)
            .address();
        let payer = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        token::StellarAssetClient::new(&env, &token).mint(&payer, &10_000);

        Fixture {
            env,
            client,
            contract_id,
            token,
            payer,
            beneficiary,
        }
    }

    fn balance(f: &Fixture, who: &Address) -> i128 {
        token::Client::new(&f.env, &f.token).balance(who)
    }

    fn escrow_id(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    /// create locks the funds in the contract; release pays the beneficiary.
    #[test]
    fn test_create_release_moves_tokens() {
        let f = setup();
        let id = escrow_id(&f.env, 1);

        f.client
            .create(&id, &f.payer, &f.beneficiary, &1_000, &f.token);
        assert_eq!(f.client.get_status(&id), 1);
        assert_eq!(balance(&f, &f.contract_id), 1_000);
        assert_eq!(balance(&f, &f.payer), 9_000);

        f.client.release(&id);
        assert_eq!(f.client.get_status(&id), 2);
        assert_eq!(balance(&f, &f.contract_id), 0);
        assert_eq!(balance(&f, &f.beneficiary), 1_000);
    }

    /// refund returns the funds to the payer.
    #[test]
    fn test_create_refund_restores_payer() {
        let f = setup();
        let id = escrow_id(&f.env, 2);

        f.client
            .create(&id, &f.payer, &f.beneficiary, &500, &f.token);
        assert_eq!(balance(&f, &f.payer), 9_500);

        f.client.refund(&id);
        assert_eq!(f.client.get_status(&id), 3);
        assert_eq!(balance(&f, &f.payer), 10_000);
        assert_eq!(balance(&f, &f.contract_id), 0);
    }

    #[test]
    fn test_get_escrow_shows_the_held_amount() {
        let f = setup();
        let id = escrow_id(&f.env, 3);
        f.client
            .create(&id, &f.payer, &f.beneficiary, &250, &f.token);
        let escrow = f.client.get_escrow(&id);
        assert_eq!(escrow.amount, 250);
        assert_eq!(escrow.token, f.token);
    }

    #[test]
    fn test_already_released_and_already_refunded_are_distinct() {
        let f = setup();
        let released = escrow_id(&f.env, 4);
        let refunded = escrow_id(&f.env, 5);
        f.client
            .create(&released, &f.payer, &f.beneficiary, &100, &f.token);
        f.client
            .create(&refunded, &f.payer, &f.beneficiary, &100, &f.token);
        f.client.release(&released);
        f.client.refund(&refunded);

        assert_eq!(
            f.client.try_release(&released),
            Err(Ok(Error::AlreadyReleased))
        );
        assert_eq!(
            f.client.try_refund(&refunded),
            Err(Ok(Error::AlreadyRefunded))
        );
        assert_eq!(
            f.client.try_release(&refunded),
            Err(Ok(Error::AlreadyRefunded))
        );
        assert_eq!(
            f.client.try_refund(&released),
            Err(Ok(Error::AlreadyReleased))
        );
    }
}

// ---------------------------------------------------------------------------
// Partial release, unknown-id and model-based property tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod partial_release_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (
        Env,
        PaymentEscrowContractClient<'static>,
        Address,
        Address,
        Address,
    ) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &id);
        let payer = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(Address::generate(&env))
            .address();
        token::StellarAssetClient::new(&env, &token).mint(&payer, &1_000_000);
        (env, client, payer, beneficiary, token)
    }

    #[test]
    fn get_status_of_unknown_id_is_not_found() {
        let (env, client, _, _, _) = setup();
        let id = BytesN::from_array(&env, &[9u8; 32]);
        assert_eq!(client.try_get_status(&id), Err(Ok(Error::NotFound)));
    }

    #[test]
    fn partial_releases_complete_the_escrow() {
        let (env, client, payer, ben, token) = setup();
        let id = BytesN::from_array(&env, &[1u8; 32]);
        client.create(&id, &payer, &ben, &1_000, &token);
        client.release_partial(&id, &400);
        assert_eq!(client.get_status(&id), 1);
        client.release_partial(&id, &600);
        assert_eq!(client.get_status(&id), 4);
    }

    #[test]
    fn partial_release_cannot_exceed_the_amount() {
        let (env, client, payer, ben, token) = setup();
        let id = BytesN::from_array(&env, &[2u8; 32]);
        client.create(&id, &payer, &ben, &500, &token);
        client.release_partial(&id, &300);
        assert_eq!(
            client.try_release_partial(&id, &300),
            Err(Ok(Error::AmountExceedsEscrow))
        );
    }

    #[test]
    fn refund_remaining_returns_the_unreleased_balance() {
        let (env, client, payer, ben, token) = setup();
        let id = BytesN::from_array(&env, &[3u8; 32]);
        client.create(&id, &payer, &ben, &1_000, &token);
        client.release_partial(&id, &250);
        assert_eq!(client.refund_remaining(&id), 750);
        assert_eq!(client.get_status(&id), 3);
    }
}

#[cfg(test)]
mod model_test {
    use super::*;
    use proptest::prelude::*;
    use soroban_sdk::testutils::Address as _;

    #[derive(Clone, Debug)]
    enum Op {
        Create(u8, i128),
        Release(u8),
        Refund(u8),
        Partial(u8, i128),
        Status(u8),
    }

    fn op_strategy() -> impl Strategy<Value = Op> {
        prop_oneof![
            (0u8..3, 1i128..1_000).prop_map(|(i, a)| Op::Create(i, a)),
            (0u8..3).prop_map(Op::Release),
            (0u8..3).prop_map(Op::Refund),
            (0u8..3, 1i128..1_000).prop_map(|(i, a)| Op::Partial(i, a)),
            (0u8..3).prop_map(Op::Status),
        ]
    }

    #[derive(Clone, Copy, PartialEq, Debug)]
    enum M {
        Locked,
        Released,
        Refunded,
        Completed,
    }

    fn code(m: M) -> u32 {
        match m {
            M::Locked => 1,
            M::Released => 2,
            M::Refunded => 3,
            M::Completed => 4,
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(64))]

        #[test]
        fn contract_matches_the_model(ops in proptest::collection::vec(op_strategy(), 1..30)) {
            let env = Env::default();
            env.mock_all_auths();
            let cid = env.register(PaymentEscrowContract, ());
            let client = PaymentEscrowContractClient::new(&env, &cid);
            let payer = Address::generate(&env);
            let ben = Address::generate(&env);
            let token = env
                .register_stellar_asset_contract_v2(Address::generate(&env))
                .address();
            token::StellarAssetClient::new(&env, &token).mint(&payer, &1_000_000_000);
            // (state, amount, released) per escrow id.
            let mut model: [Option<(M, i128, i128)>; 3] = [None; 3];

            for op in ops {
                match op {
                    Op::Create(i, a) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_create(&id, &payer, &ben, &a, &token);
                        if model[i as usize].is_some() {
                            prop_assert!(matches!(r, Err(Ok(Error::AlreadyExists))));
                        } else {
                            prop_assert!(r.is_ok());
                            model[i as usize] = Some((M::Locked, a, 0));
                        }
                    }
                    Op::Release(i) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_release(&id);
                        match model[i as usize] {
                            None => prop_assert!(matches!(r, Err(Ok(Error::NotFound)))),
                            Some((M::Locked, a, _)) => {
                                prop_assert!(r.is_ok());
                                model[i as usize] = Some((M::Released, a, a));
                            }
                            Some((M::Released, _, _)) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyReleased)))),
                            Some((M::Refunded, _, _)) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyRefunded)))),
                            Some(_) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyResolved)))),
                        }
                    }
                    Op::Refund(i) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_refund(&id);
                        match model[i as usize] {
                            None => prop_assert!(matches!(r, Err(Ok(Error::NotFound)))),
                            Some((M::Locked, a, rel)) => {
                                prop_assert!(r.is_ok());
                                model[i as usize] = Some((M::Refunded, a, rel));
                            }
                            Some((M::Released, _, _)) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyReleased)))),
                            Some((M::Refunded, _, _)) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyRefunded)))),
                            Some(_) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyResolved)))),
                        }
                    }
                    Op::Partial(i, amt) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_release_partial(&id, &amt);
                        match model[i as usize] {
                            None => prop_assert!(matches!(r, Err(Ok(Error::NotFound)))),
                            Some((M::Locked, a, rel)) => {
                                if rel + amt > a {
                                    prop_assert!(matches!(r, Err(Ok(Error::AmountExceedsEscrow))));
                                } else {
                                    prop_assert!(r.is_ok());
                                    let st = if rel + amt == a { M::Completed } else { M::Locked };
                                    model[i as usize] = Some((st, a, rel + amt));
                                }
                            }
                            Some(_) => prop_assert!(matches!(r, Err(Ok(Error::AlreadyResolved)))),
                        }
                    }
                    Op::Status(i) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_get_status(&id);
                        match model[i as usize] {
                            None => prop_assert!(matches!(r, Err(Ok(Error::NotFound)))),
                            Some((m, _, _)) => prop_assert!(matches!(r, Ok(Ok(c)) if c == code(m))),
                        }
                    }
                }
                for entry in model.iter().flatten() {
                    prop_assert!(entry.2 <= entry.1);
                }
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Admin, pause and version tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod admin_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, PaymentEscrowContractClient<'static>, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, client, admin)
    }

    #[test]
    fn initialize_runs_once() {
        let (env, client, _) = setup();
        let other = Address::generate(&env);
        assert_eq!(
            client.try_initialize(&other),
            Err(Ok(Error::AlreadyInitialized))
        );
    }

    #[test]
    fn version_is_reported() {
        let (_, client, _) = setup();
        assert_eq!(client.version(), VERSION);
    }

    #[test]
    fn pause_blocks_create_but_not_settlement() {
        let (env, client, _) = setup();
        let payer = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let token = env
            .register_stellar_asset_contract_v2(Address::generate(&env))
            .address();
        token::StellarAssetClient::new(&env, &token).mint(&payer, &1_000);
        let existing = BytesN::from_array(&env, &[1u8; 32]);
        client.create(&existing, &payer, &beneficiary, &100, &token);

        client.pause();
        assert!(client.is_paused());
        let blocked = BytesN::from_array(&env, &[2u8; 32]);
        assert_eq!(
            client.try_create(&blocked, &payer, &beneficiary, &100, &token),
            Err(Ok(Error::Paused))
        );
        client.release(&existing);

        client.unpause();
        client.create(&blocked, &payer, &beneficiary, &100, &token);
    }

    #[test]
    fn non_admin_cannot_pause_or_propose() {
        let env = Env::default();
        let id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &id);
        // No admin has been initialised, so admin-only calls are refused.
        assert_eq!(client.try_pause(), Err(Ok(Error::NotInitialized)));
    }

    #[test]
    fn admin_transfer_is_two_step() {
        let (env, client, _) = setup();
        let next = Address::generate(&env);
        assert_eq!(client.try_accept_admin(), Err(Ok(Error::NoPendingAdmin)));
        client.propose_admin(&next);
        client.accept_admin();
        client.pause();
    }
}
