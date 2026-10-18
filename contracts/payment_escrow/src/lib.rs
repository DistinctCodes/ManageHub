#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Env, Address, BytesN};

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
    pub amount: i128,
    /// Total released to the beneficiary so far (`released <= amount`).
    pub released: i128,
    pub state: EscrowState,
}

#[contracttype]
pub enum DataKey {
    Escrow(BytesN<32>),
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
    /// A partial release would exceed the amount still locked.
    AmountExceedsEscrow = 20,
    /// Nothing remains to refund.
    NothingToRefund = 21,
}

#[contract]
pub struct PaymentEscrowContract;

#[contractimpl]
impl PaymentEscrowContract {
    /// Create a new escrow, locking `amount` from `payer` for `beneficiary`.
    ///
    /// CT-73: uses checked arithmetic on all amount paths.
    pub fn create(
        env: Env,
        escrow_id: BytesN<32>,
        payer: Address,
        beneficiary: Address,
        amount: i128,
    ) -> Result<(), Error> {
        payer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if env.storage().persistent().has(&DataKey::Escrow(escrow_id.clone())) {
            return Err(Error::AlreadyExists);
        }

        let escrow = Escrow {
            payer,
            beneficiary,
            amount,
            released: 0,
            state: EscrowState::Locked,
        };

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
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

        if escrow.state != EscrowState::Locked {
            return Err(Error::AlreadyResolved);
        }

        escrow.released = escrow.amount;
        escrow.state = EscrowState::Released;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
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

        escrow.released = released;
        if released == escrow.amount {
            escrow.state = EscrowState::Completed;
        }
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
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

        escrow.state = EscrowState::Refunded;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
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

        if escrow.state != EscrowState::Locked {
            return Err(Error::AlreadyResolved);
        }

        escrow.state = EscrowState::Refunded;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
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
// CT-73: Checked arithmetic helpers
// ---------------------------------------------------------------------------
// These demonstrate the pattern required by issue #1687. Any future amount
// handling (e.g. batch totals, basis-point fees, dispute windows) MUST use
// checked_add / checked_sub instead of raw +/- operators.

/// Safely add two i128 amounts, returning ArithmeticOverflow on overflow.
#[allow(dead_code)]
pub fn checked_amount_add(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_add(b).ok_or(Error::ArithmeticOverflow)
}

/// Safely subtract two i128 amounts, returning ArithmeticOverflow on underflow.
#[allow(dead_code)]
pub fn checked_amount_sub(a: i128, b: i128) -> Result<i128, Error> {
    a.checked_sub(b).ok_or(Error::ArithmeticOverflow)
}

#[cfg(test)]
mod test {
    use super::*;

    // CT-73: verify checked arithmetic rejects overflow/underflow cleanly
    #[test]
    fn test_checked_add_overflow() {
        let result = checked_amount_add(i128::MAX, 1);
        assert_eq!(result, Err(Error::ArithmeticOverflow));
    }

    #[test]
    fn test_checked_sub_underflow() {
        let result = checked_amount_sub(i128::MIN, 1);
        assert_eq!(result, Err(Error::ArithmeticOverflow));
    }

    #[test]
    fn test_checked_add_valid() {
        let result = checked_amount_add(100, 200);
        assert_eq!(result, Ok(300));
    }

    #[test]
    fn test_checked_sub_valid() {
        let result = checked_amount_sub(500, 200);
        assert_eq!(result, Ok(300));
    }
}

// ---------------------------------------------------------------------------
// CT-51: happy-path tests for create/release/refund/get_status
// ---------------------------------------------------------------------------

#[cfg(test)]
mod escrow_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, PaymentEscrowContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &contract_id);

        let payer = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        (env, client, payer, beneficiary)
    }

    fn escrow_id(env: &Env, seed: u8) -> BytesN<32> {
        BytesN::from_array(env, &[seed; 32])
    }

    /// create -> get_status=Locked -> release -> get_status=Released.
    #[test]
    fn test_create_release_happy_path() {
        let (env, client, payer, beneficiary) = setup();
        let id = escrow_id(&env, 1);

        client.create(&id, &payer, &beneficiary, &1_000);
        assert_eq!(client.get_status(&id), 1); // Locked

        client.release(&id);
        assert_eq!(client.get_status(&id), 2); // Released
    }

    /// create -> get_status=Locked -> refund -> get_status=Refunded.
    #[test]
    fn test_create_refund_happy_path() {
        let (env, client, payer, beneficiary) = setup();
        let id = escrow_id(&env, 2);

        client.create(&id, &payer, &beneficiary, &500);
        assert_eq!(client.get_status(&id), 1); // Locked

        client.refund(&id);
        assert_eq!(client.get_status(&id), 3); // Refunded
    }
}

// ---------------------------------------------------------------------------
// Partial release, unknown-id and model-based property tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod partial_release_test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, PaymentEscrowContractClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(PaymentEscrowContract, ());
        let client = PaymentEscrowContractClient::new(&env, &id);
        (env, client, Address::generate(&env), Address::generate(&env))
    }

    #[test]
    fn get_status_of_unknown_id_is_not_found() {
        let (env, client, _, _) = setup();
        let id = BytesN::from_array(&env, &[9u8; 32]);
        assert_eq!(client.try_get_status(&id), Err(Ok(Error::NotFound)));
    }

    #[test]
    fn partial_releases_complete_the_escrow() {
        let (env, client, payer, ben) = setup();
        let id = BytesN::from_array(&env, &[1u8; 32]);
        client.create(&id, &payer, &ben, &1_000);
        client.release_partial(&id, &400);
        assert_eq!(client.get_status(&id), 1);
        client.release_partial(&id, &600);
        assert_eq!(client.get_status(&id), 4);
    }

    #[test]
    fn partial_release_cannot_exceed_the_amount() {
        let (env, client, payer, ben) = setup();
        let id = BytesN::from_array(&env, &[2u8; 32]);
        client.create(&id, &payer, &ben, &500);
        client.release_partial(&id, &300);
        assert_eq!(
            client.try_release_partial(&id, &300),
            Err(Ok(Error::AmountExceedsEscrow))
        );
    }

    #[test]
    fn refund_remaining_returns_the_unreleased_balance() {
        let (env, client, payer, ben) = setup();
        let id = BytesN::from_array(&env, &[3u8; 32]);
        client.create(&id, &payer, &ben, &1_000);
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
            // (state, amount, released) per escrow id.
            let mut model: [Option<(M, i128, i128)>; 3] = [None; 3];

            for op in ops {
                match op {
                    Op::Create(i, a) => {
                        let id = BytesN::from_array(&env, &[i; 32]);
                        let r = client.try_create(&id, &payer, &ben, &a);
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
