// contracts/sandbox/resource_credits/src/lib.rs
#![no_std]

mod errors;
mod types;

#[cfg(test)]
mod test;

pub use errors::Error;
pub use types::{CreditBalance, CreditsMinted, CreditsSpent, CreditsTransferred};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Contract administrator address.
    Admin,
    /// Credit balance record keyed by member address.
    Balance(Address),
    /// Total credits in circulation.
    TotalSupply,
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct ResourceCreditsContract;

#[contractimpl]
impl ResourceCreditsContract {
    // ── Helpers ───────────────────────────────────────────────────────────────

    fn get_admin_addr(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin = Self::get_admin_addr(env)?;
        if caller != &admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    fn load_balance(env: &Env, member: &Address) -> CreditBalance {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(member.clone()))
            .unwrap_or(CreditBalance {
                amount: 0,
                expires_at: None,
            })
    }

    fn check_not_expired(env: &Env, bal: &CreditBalance) -> Result<(), Error> {
        if let Some(exp) = bal.expires_at {
            if env.ledger().timestamp() > exp {
                return Err(Error::CreditsExpired);
            }
        }
        Ok(())
    }

    // ── Admin / init ──────────────────────────────────────────────────────────

    /// Initialise the contract, setting the admin. Can only be called once.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env
            .storage()
            .instance()
            .has(&DataKey::Admin)
        {
            return Err(Error::AlreadyInitialized);
        }
        env.storage()
            .instance()
            .set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &0u128);
        Ok(())
    }

    // ── Mutating functions ────────────────────────────────────────────────────

    /// Mint `amount` credits to `member`. Admin only.
    /// `expires_at` is an optional ledger timestamp after which credits expire.
    pub fn mint_credits(
        env: Env,
        caller: Address,
        member: Address,
        amount: u128,
        expires_at: Option<u64>,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let mut bal = Self::load_balance(&env, &member);
        bal.amount = bal.amount.saturating_add(amount);
        bal.expires_at = expires_at;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(member.clone()), &bal);

        let supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &supply.saturating_add(amount));

        env.events().publish(
            (symbol_short!("minted"),),
            CreditsMinted {
                member,
                amount,
                expires_at,
            },
        );
        Ok(())
    }

    /// Transfer `amount` credits from `from` to `to`.
    pub fn transfer_credits(
        env: Env,
        from: Address,
        to: Address,
        amount: u128,
    ) -> Result<(), Error> {
        from.require_auth();

        let mut from_bal = Self::load_balance(&env, &from);
        Self::check_not_expired(&env, &from_bal)?;

        if from_bal.amount < amount {
            return Err(Error::InsufficientBalance);
        }
        from_bal.amount -= amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &from_bal);

        let mut to_bal = Self::load_balance(&env, &to);
        to_bal.amount = to_bal.amount.saturating_add(amount);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &to_bal);

        env.events().publish(
            (symbol_short!("transfer"),),
            CreditsTransferred { from, to, amount },
        );
        Ok(())
    }

    /// Spend `amount` credits from `member` (reduces total supply).
    pub fn spend_credits(env: Env, member: Address, amount: u128) -> Result<(), Error> {
        member.require_auth();

        let mut bal = Self::load_balance(&env, &member);
        Self::check_not_expired(&env, &bal)?;

        if bal.amount < amount {
            return Err(Error::InsufficientBalance);
        }
        bal.amount -= amount;
        env.storage()
            .persistent()
            .set(&DataKey::Balance(member.clone()), &bal);

        let supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &supply.saturating_sub(amount));

        env.events().publish(
            (symbol_short!("spent"),),
            CreditsSpent { member, amount },
        );
        Ok(())
    }

    // ── CT-05: Read-only query functions ──────────────────────────────────────

    /// Returns the member's current credit balance (0 if never set).
    pub fn get_balance(env: Env, member: Address) -> u128 {
        Self::load_balance(&env, &member).amount
    }

    /// Returns the total credits currently in circulation.
    pub fn get_total_supply(env: Env) -> u128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Returns the current admin address.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        Self::get_admin_addr(&env)
    }

    // ── CT-06: Expiry query ───────────────────────────────────────────────────

    /// Returns `true` if the member's credits have passed their expiry timestamp.
    pub fn is_expired(env: Env, member: Address) -> bool {
        let bal = Self::load_balance(&env, &member);
        match bal.expires_at {
            Some(exp) => env.ledger().timestamp() > exp,
            None => false,
        }
    }
}
