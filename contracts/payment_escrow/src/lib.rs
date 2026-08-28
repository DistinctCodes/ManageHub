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
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub payer: Address,
    pub beneficiary: Address,
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
