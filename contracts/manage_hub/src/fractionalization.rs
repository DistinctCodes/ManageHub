#![allow(deprecated)]

use crate::errors::Error;
use crate::membership_token::{DataKey as MembershipDataKey, MembershipToken};
use crate::types::{DividendDistribution, FractionHolder, FractionalTokenInfo};
use soroban_sdk::{contracttype, Address, BytesN, Env, Map, String, Vec};

#[contracttype]
pub enum FractionDataKey {
    FractionInfo(BytesN<32>),
    FractionShares(BytesN<32>),
    PendingRewards(BytesN<32>),
}

pub struct FractionalizationModule;

impl FractionalizationModule {
    pub fn fractionalize_token(
        env: Env,
        token_id: BytesN<32>,
        total_shares: i128,
        min_fraction_size: i128,
    ) -> Result<(), Error> {
        if total_shares <= 1 {
            return Err(Error::InvalidPaymentAmount);
        }
        if min_fraction_size <= 0 || min_fraction_size > total_shares {
            return Err(Error::InvalidPaymentAmount);
        }
        if total_shares % min_fraction_size != 0 {
            return Err(Error::InvalidPaymentAmount);
        }
        if Self::is_fractionalized(&env, &token_id) {
            return Err(Error::TokenFractionalized);
        }

        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&MembershipDataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;
        if token.status != crate::types::MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }
        token.user.require_auth();

        let info = FractionalTokenInfo {
            token_id: token_id.clone(),
            total_shares,
            min_fraction_size,
            created_at: env.ledger().timestamp(),
            created_by: token.user.clone(),
        };

        let mut shares = Map::<Address, i128>::new(&env);
        shares.set(token.user.clone(), total_shares);

        env.storage()
            .persistent()
            .set(&FractionDataKey::FractionInfo(token_id.clone()), &info);
        env.storage()
            .persistent()
            .set(&FractionDataKey::FractionShares(token_id.clone()), &shares);

        env.events().publish(
            (
                String::from_str(&env, "Fractionalized"),
                token_id,
                token.user.clone(),
            ),
            (total_shares, min_fraction_size, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn transfer_fraction(
        env: Env,
        token_id: BytesN<32>,
        from: Address,
        to: Address,
        share_amount: i128,
    ) -> Result<(), Error> {
        let info = Self::get_fraction_info(&env, &token_id)?;
        if share_amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }
        if share_amount < info.min_fraction_size {
            return Err(Error::InvalidPaymentAmount);
        }
        if share_amount % info.min_fraction_size != 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        from.require_auth();

        let mut shares = Self::get_fraction_shares(&env, &token_id)?;
        let sender_shares = shares.get(from.clone()).ok_or(Error::Unauthorized)?;
        if sender_shares < share_amount {
            return Err(Error::InsufficientBalance);
        }

        let remaining = sender_shares
            .checked_sub(share_amount)
            .ok_or(Error::TimestampOverflow)?;
        if remaining > 0 && remaining < info.min_fraction_size {
            return Err(Error::InvalidPaymentAmount);
        }

        if remaining == 0 {
            shares.remove(from.clone());
        } else {
            shares.set(from.clone(), remaining);
        }

        let receiver_shares = shares.get(to.clone()).unwrap_or(0);
        let new_receiver_shares = receiver_shares
            .checked_add(share_amount)
            .ok_or(Error::TimestampOverflow)?;
        shares.set(to.clone(), new_receiver_shares);

        env.storage()
            .persistent()
            .set(&FractionDataKey::FractionShares(token_id.clone()), &shares);

        env.events().publish(
            (
                String::from_str(&env, "FractionTransferred"),
                token_id,
                from,
            ),
            (to, share_amount, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn recombine_fractions(
        env: Env,
        token_id: BytesN<32>,
        holder: Address,
    ) -> Result<(), Error> {
        let info = Self::get_fraction_info(&env, &token_id)?;
        holder.require_auth();

        let shares = Self::get_fraction_shares(&env, &token_id)?;
        let holder_shares = shares.get(holder.clone()).ok_or(Error::Unauthorized)?;
        if holder_shares != info.total_shares {
            return Err(Error::Unauthorized);
        }

        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&MembershipDataKey::Token(token_id.clone()))
            .ok_or(Error::TokenNotFound)?;
        token.user = holder.clone();

        env.storage()
            .persistent()
            .set(&MembershipDataKey::Token(token_id.clone()), &token);
        env.storage()
            .persistent()
            .remove(&FractionDataKey::FractionInfo(token_id.clone()));
        env.storage()
            .persistent()
            .remove(&FractionDataKey::FractionShares(token_id.clone()));
        env.storage()
            .persistent()
            .remove(&FractionDataKey::PendingRewards(token_id.clone()));

        env.events().publish(
            (
                String::from_str(&env, "Recombined"),
                token_id,
                holder.clone(),
            ),
            env.ledger().timestamp(),
        );

        Ok(())
    }

    pub fn get_fraction_holders(
        env: Env,
        token_id: BytesN<32>,
    ) -> Result<Vec<FractionHolder>, Error> {
        let info = Self::get_fraction_info(&env, &token_id)?;
        let shares = Self::get_fraction_shares(&env, &token_id)?;
        let holder_keys: Vec<Address> = shares.keys();

        let mut holders = Vec::new(&env);
        for holder in holder_keys.iter() {
            let holder_address: Address = holder;
            if let Some(share_count) = shares.get(holder_address.clone()) {
                let voting_power = share_count
                    .checked_mul(10_000)
                    .ok_or(Error::TimestampOverflow)?
                    .checked_div(info.total_shares)
                    .ok_or(Error::TimestampOverflow)?;

                holders.push_back(FractionHolder {
                    holder: holder_address,
                    shares: share_count,
                    voting_power_bps: voting_power as u32,
                });
            }
        }

        Ok(holders)
    }

    pub fn distribute_fraction_rewards(
        env: Env,
        token_id: BytesN<32>,
        total_amount: i128,
    ) -> Result<DividendDistribution, Error> {
        if total_amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        let admin: Address = env
            .storage()
            .instance()
            .get(&MembershipDataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        let info = Self::get_fraction_info(&env, &token_id)?;
        let shares = Self::get_fraction_shares(&env, &token_id)?;
        let holder_keys: Vec<Address> = shares.keys();
        let recipients = holder_keys.len();
        if recipients == 0 {
            return Err(Error::Unauthorized);
        }

        let mut rewards = Self::get_pending_rewards(&env, &token_id);
        let mut distributed = 0i128;
        for holder in holder_keys.iter() {
            let holder_address: Address = holder;
            let share_count = shares
                .get(holder_address.clone())
                .ok_or(Error::Unauthorized)?;
            let holder_amount = total_amount
                .checked_mul(share_count)
                .ok_or(Error::TimestampOverflow)?
                .checked_div(info.total_shares)
                .ok_or(Error::TimestampOverflow)?;

            distributed = distributed
                .checked_add(holder_amount)
                .ok_or(Error::TimestampOverflow)?;

            let current = rewards.get(holder_address.clone()).unwrap_or(0);
            rewards.set(
                holder_address,
                current
                    .checked_add(holder_amount)
                    .ok_or(Error::TimestampOverflow)?,
            );
        }

        let remainder = total_amount
            .checked_sub(distributed)
            .ok_or(Error::TimestampOverflow)?;
        if remainder > 0 {
            let first_holder = holder_keys.get(0).ok_or(Error::Unauthorized)?;
            let current = rewards.get(first_holder.clone()).unwrap_or(0);
            rewards.set(
                first_holder,
                current
                    .checked_add(remainder)
                    .ok_or(Error::TimestampOverflow)?,
            );
        }

        env.storage()
            .persistent()
            .set(&FractionDataKey::PendingRewards(token_id.clone()), &rewards);

        let distribution = DividendDistribution {
            token_id: token_id.clone(),
            total_amount,
            recipients,
            distributed_at: env.ledger().timestamp(),
        };

        env.events().publish(
            (
                String::from_str(&env, "DividendDistributed"),
                token_id,
                admin,
            ),
            (total_amount, recipients, distribution.distributed_at),
        );

        Ok(distribution)
    }

    pub fn get_pending_fraction_reward(
        env: Env,
        token_id: BytesN<32>,
        holder: Address,
    ) -> Result<i128, Error> {
        Self::get_fraction_info(&env, &token_id)?;
        let rewards = Self::get_pending_rewards(&env, &token_id);
        Ok(rewards.get(holder).unwrap_or(0))
    }

    pub fn is_fractionalized(env: &Env, token_id: &BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&FractionDataKey::FractionInfo(token_id.clone()))
    }

    fn get_fraction_info(env: &Env, token_id: &BytesN<32>) -> Result<FractionalTokenInfo, Error> {
        env.storage()
            .persistent()
            .get(&FractionDataKey::FractionInfo(token_id.clone()))
            .ok_or(Error::TokenNotFound)
    }

    fn get_fraction_shares(env: &Env, token_id: &BytesN<32>) -> Result<Map<Address, i128>, Error> {
        env.storage()
            .persistent()
            .get(&FractionDataKey::FractionShares(token_id.clone()))
            .ok_or(Error::TokenNotFound)
    }

    fn get_pending_rewards(env: &Env, token_id: &BytesN<32>) -> Map<Address, i128> {
        env.storage()
            .persistent()
            .get(&FractionDataKey::PendingRewards(token_id.clone()))
            .unwrap_or_else(|| Map::new(env))
    }
}
