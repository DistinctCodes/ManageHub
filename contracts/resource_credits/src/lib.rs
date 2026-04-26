#![no_std]

mod errors;
mod types;

use errors::Error;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

/// Storage keys for the contract.
#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Balance(Address),
    TotalSupply,
    TransactionHistory(Address),
}

#[contract]
pub struct ResourceCreditsContract;

#[contractimpl]
impl ResourceCreditsContract {
    /// Initialize the contract with an admin and payment token.
    pub fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &0u128);
        Ok(())
    }

    /// Mint credits to a recipient (admin only).
    ///
    /// CT-02: increases recipient balance and TotalSupply.
    pub fn mint_credits(
        env: Env,
        caller: Address,
        recipient: Address,
        amount: u128,
    ) -> Result<(), Error> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        if caller != admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();

        let bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(recipient.clone()))
            .unwrap_or(0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(recipient.clone()), &(bal + amount));

        let supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0u128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));

        env.events().publish(
            (symbol_short!("mint"), recipient),
            amount,
        );
        Ok(())
    }

    /// Transfer credits from one member to another.
    ///
    /// CT-03: sender balance decremented, recipient balance incremented.
    pub fn transfer_credits(
        env: Env,
        from: Address,
        to: Address,
        amount: u128,
    ) -> Result<(), Error> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        from.require_auth();

        let from_bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0u128);
        if from_bal < amount {
            return Err(Error::InsufficientBalance);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_bal - amount));

        let to_bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(to_bal + amount));

        env.events().publish(
            (symbol_short!("transfer"), from, to),
            amount,
        );
        Ok(())
    }

    /// Spend (burn) credits from a member's balance.
    ///
    /// CT-04: decrements member balance and TotalSupply.
    pub fn spend_credits(env: Env, member: Address, amount: u128) -> Result<(), Error> {
        if amount == 0 {
            return Err(Error::InvalidAmount);
        }
        member.require_auth();

        let bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(member.clone()))
            .unwrap_or(0u128);
        if bal < amount {
            return Err(Error::InsufficientBalance);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(member.clone()), &(bal - amount));

        let supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0u128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - amount));

        env.events().publish(
            (symbol_short!("spend"), member),
            amount,
        );
        Ok(())
    }

    /// Get the credit balance of a member.
    pub fn balance(env: Env, member: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(member))
            .unwrap_or(0u128)
    }

    /// Get the total supply of credits.
    pub fn total_supply(env: Env) -> u128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0u128)
    }
}
