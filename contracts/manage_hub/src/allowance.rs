#![allow(deprecated)]

use crate::errors::Error;
use crate::types::TokenAllowance;
use soroban_sdk::{contracttype, Address, BytesN, Env, String};

#[contracttype]
pub enum AllowanceDataKey {
    Allowance(BytesN<32>, Address, Address),
}

pub struct AllowanceModule;

impl AllowanceModule {
    pub fn approve(
        env: &Env,
        token_id: &BytesN<32>,
        owner: &Address,
        spender: &Address,
        amount: i128,
        expires_at: Option<u64>,
    ) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }
        if owner == spender {
            return Err(Error::Unauthorized);
        }
        if let Some(expiry) = expires_at {
            if expiry <= env.ledger().timestamp() {
                return Err(Error::InvalidExpiryDate);
            }
        }

        let allowance = TokenAllowance {
            token_id: token_id.clone(),
            owner: owner.clone(),
            spender: spender.clone(),
            amount,
            expires_at,
            updated_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(
            &AllowanceDataKey::Allowance(token_id.clone(), owner.clone(), spender.clone()),
            &allowance,
        );

        env.events().publish(
            (
                String::from_str(env, "Approval"),
                token_id.clone(),
                owner.clone(),
                spender.clone(),
            ),
            (amount, expires_at, allowance.updated_at),
        );

        Ok(())
    }

    pub fn revoke_allowance(env: &Env, token_id: &BytesN<32>, owner: &Address, spender: &Address) {
        env.storage()
            .persistent()
            .remove(&AllowanceDataKey::Allowance(
                token_id.clone(),
                owner.clone(),
                spender.clone(),
            ));

        env.events().publish(
            (
                String::from_str(env, "AllowanceRevoked"),
                token_id.clone(),
                owner.clone(),
                spender.clone(),
            ),
            env.ledger().timestamp(),
        );
    }

    pub fn get_allowance(
        env: &Env,
        token_id: &BytesN<32>,
        owner: &Address,
        spender: &Address,
    ) -> Option<TokenAllowance> {
        let key = AllowanceDataKey::Allowance(token_id.clone(), owner.clone(), spender.clone());
        let allowance: Option<TokenAllowance> = env.storage().persistent().get(&key);

        if let Some(current) = allowance {
            if Self::is_expired(env, &current) {
                env.storage().persistent().remove(&key);
                return None;
            }
            return Some(current);
        }

        None
    }

    pub fn consume_allowance(
        env: &Env,
        token_id: &BytesN<32>,
        owner: &Address,
        spender: &Address,
        amount: i128,
    ) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        let key = AllowanceDataKey::Allowance(token_id.clone(), owner.clone(), spender.clone());
        let mut allowance: TokenAllowance = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::Unauthorized)?;

        if Self::is_expired(env, &allowance) {
            env.storage().persistent().remove(&key);
            return Err(Error::Unauthorized);
        }

        if allowance.amount < amount {
            return Err(Error::InsufficientBalance);
        }

        allowance.amount = allowance
            .amount
            .checked_sub(amount)
            .ok_or(Error::TimestampOverflow)?;
        allowance.updated_at = env.ledger().timestamp();

        if allowance.amount == 0 {
            env.storage().persistent().remove(&key);
        } else {
            env.storage().persistent().set(&key, &allowance);
        }

        env.events().publish(
            (
                String::from_str(env, "AllowanceUsed"),
                token_id.clone(),
                owner.clone(),
                spender.clone(),
            ),
            (amount, allowance.amount, allowance.updated_at),
        );

        Ok(())
    }

    fn is_expired(env: &Env, allowance: &TokenAllowance) -> bool {
        if let Some(expiry) = allowance.expires_at {
            return env.ledger().timestamp() >= expiry;
        }
        false
    }
}
