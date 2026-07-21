#![no_std]

use soroban_sdk::{contract, contractimpl, contracterror, contracttype, Address, BytesN, Env, String};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum EscrowStatus {
    Funded,
    Released,
    Refunded,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct EscrowRecord {
    pub id: BytesN<32>,
    pub platform_custodian: Address,
    pub payer: Address,
    pub payee: Address,
    pub amount: i128,
    pub token: Address,
    pub status: EscrowStatus,
    pub booking_id: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracterror]
pub enum Error {
    AlreadyFunded = 1,
    NotFunded = 2,
    NotCustodian = 3,
    Unauthorized = 4,
    InvalidAmount = 5,
    EscrowNotFound = 6,
}

#[contract]
pub struct PaymentEscrow;

#[contractimpl]
impl PaymentEscrow {
    pub fn create_escrow(
        env: Env,
        id: BytesN<32>,
        platform_custodian: Address,
        payer: Address,
        payee: Address,
        amount: i128,
        token: Address,
        booking_id: String,
    ) -> Result<EscrowRecord, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        if env.storage().instance().has(&escrow_key(&id)) {
            return Err(Error::AlreadyFunded);
        }

        payer.require_auth();

        let now = env.ledger().timestamp();
        let record = EscrowRecord {
            id: id.clone(),
            platform_custodian: platform_custodian.clone(),
            payer: payer.clone(),
            payee: payee.clone(),
            amount,
            token: token.clone(),
            status: EscrowStatus::Funded,
            booking_id,
            created_at: now,
            updated_at: now,
        };

        env.storage().instance().set(&escrow_key(&id), &record);

        Ok(record)
    }

    pub fn release_escrow(
        env: Env,
        custodian: Address,
        id: BytesN<32>,
    ) -> Result<EscrowRecord, Error> {
        let mut record = get_escrow(&env, &id)?;

        custodian.require_auth();

        if custodian != record.platform_custodian {
            return Err(Error::NotCustodian);
        }

        if record.status != EscrowStatus::Funded {
            return Err(Error::NotFunded);
        }

        record.status = EscrowStatus::Released;
        record.updated_at = env.ledger().timestamp();
        env.storage().instance().set(&escrow_key(&id), &record);

        Ok(record)
    }

    pub fn refund_escrow(
        env: Env,
        custodian: Address,
        id: BytesN<32>,
    ) -> Result<EscrowRecord, Error> {
        let mut record = get_escrow(&env, &id)?;

        custodian.require_auth();

        if custodian != record.platform_custodian {
            return Err(Error::NotCustodian);
        }

        if record.status != EscrowStatus::Funded {
            return Err(Error::NotFunded);
        }

        record.status = EscrowStatus::Refunded;
        record.updated_at = env.ledger().timestamp();
        env.storage().instance().set(&escrow_key(&id), &record);

        Ok(record)
    }

    pub fn get_escrow(env: Env, id: BytesN<32>) -> Result<EscrowRecord, Error> {
        get_escrow(&env, &id)
    }
}

fn escrow_key(id: &BytesN<32>) -> BytesN<32> {
    id.clone()
}

fn get_escrow(env: &Env, id: &BytesN<32>) -> Result<EscrowRecord, Error> {
    env.storage()
        .instance()
        .get(&escrow_key(id))
        .ok_or(Error::EscrowNotFound)
}
