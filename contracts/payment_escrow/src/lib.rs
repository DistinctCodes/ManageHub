#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, contracterror, token, Env, Address, BytesN};

/// On-chain escrow status codes.
/// Maps to backend EscrowStatus enum: 0=NotFound, 1=Locked, 2=Released, 3=Refunded.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum EscrowState {
    Locked = 1,
    Released = 2,
    Refunded = 3,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub payer: Address,
    pub beneficiary: Address,
    /// Token contract whose balance this escrow holds.
    pub token: Address,
    pub amount: i128,
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
    /// The escrow was already released.
    AlreadyReleased = 6,
    /// The escrow was already refunded.
    AlreadyRefunded = 7,
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
        token: Address,
    ) -> Result<(), Error> {
        payer.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if env.storage().persistent().has(&DataKey::Escrow(escrow_id.clone())) {
            return Err(Error::AlreadyExists);
        }

        // Pull the funds into the contract before recording the escrow.
        token::Client::new(&env, &token).transfer(
            &payer,
            &env.current_contract_address(),
            &amount,
        );

        let escrow = Escrow {
            payer,
            beneficiary,
            token,
            amount,
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

        match escrow.state {
            EscrowState::Locked => {}
            EscrowState::Released => return Err(Error::AlreadyReleased),
            EscrowState::Refunded => return Err(Error::AlreadyRefunded),
        }

        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.beneficiary,
            &escrow.amount,
        );
        escrow.state = EscrowState::Released;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        Ok(())
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
        }

        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.payer,
            &escrow.amount,
        );
        escrow.state = EscrowState::Refunded;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
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
        let token = env.register_stellar_asset_contract_v2(token_admin).address();
        let payer = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        token::StellarAssetClient::new(&env, &token).mint(&payer, &10_000);

        Fixture { env, client, contract_id, token, payer, beneficiary }
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

        f.client.create(&id, &f.payer, &f.beneficiary, &1_000, &f.token);
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

        f.client.create(&id, &f.payer, &f.beneficiary, &500, &f.token);
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
        f.client.create(&id, &f.payer, &f.beneficiary, &250, &f.token);
        let escrow = f.client.get_escrow(&id);
        assert_eq!(escrow.amount, 250);
        assert_eq!(escrow.token, f.token);
    }

    #[test]
    fn test_already_released_and_already_refunded_are_distinct() {
        let f = setup();
        let released = escrow_id(&f.env, 4);
        let refunded = escrow_id(&f.env, 5);
        f.client.create(&released, &f.payer, &f.beneficiary, &100, &f.token);
        f.client.create(&refunded, &f.payer, &f.beneficiary, &100, &f.token);
        f.client.release(&released);
        f.client.refund(&refunded);

        assert_eq!(f.client.try_release(&released), Err(Ok(Error::AlreadyReleased)));
        assert_eq!(f.client.try_refund(&refunded), Err(Ok(Error::AlreadyRefunded)));
        assert_eq!(f.client.try_release(&refunded), Err(Ok(Error::AlreadyRefunded)));
        assert_eq!(f.client.try_refund(&released), Err(Ok(Error::AlreadyReleased)));
    }
}
