#![no_std]
// The env.events().publish() API is deprecated in favour of #[contractevent],
// but kept here for consistency with the rest of the ManageHub contracts.
#![allow(deprecated)]

mod errors;
mod types;

#[cfg(test)]
mod proptest_tests;

use errors::Error;
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};
use types::{Credit, ReconciliationReport};

/// Storage keys for the contract.
#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Balance(Address),
    TotalSupply,
    TransactionHistory(Address),
    CreditExpiry(Address),
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
        // SAFETY: requires auth — prevents front-running initialization
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.storage().instance().set(&DataKey::TotalSupply, &0u128);
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

        env.events()
            .publish((symbol_short!("mint"), recipient), amount);
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

        env.events()
            .publish((symbol_short!("transfer"), from, to), amount);
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

        env.events()
            .publish((symbol_short!("spend"), member), amount);
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

    /// Mint credits to a recipient with an optional expiry timestamp (admin only).
    pub fn mint_credits_with_expiry(
        env: Env,
        caller: Address,
        recipient: Address,
        amount: u128,
        expires_at: Option<u64>,
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

        // Store the expiry for this recipient's latest mint
        let credit = Credit {
            owner: recipient.clone(),
            amount,
            expires_at,
        };
        env.storage()
            .persistent()
            .set(&DataKey::CreditExpiry(recipient.clone()), &credit);

        env.events()
            .publish((symbol_short!("mint_exp"), recipient), amount);
        Ok(())
    }

    /// Expire credits past their TTL.
    ///
    /// Burns the expired amount from the holder's balance and decrements total supply.
    /// Returns the amount burned, or 0 if no expiry is set.
    pub fn expire_credits(env: Env, member: Address) -> Result<u128, Error> {
        let credit: Credit = env
            .storage()
            .persistent()
            .get(&DataKey::CreditExpiry(member.clone()))
            .ok_or(Error::CreditExpired)?;

        let expires_at = credit.expires_at.ok_or(Error::CreditExpired)?;

        let ledger_seq = env.ledger().sequence() as u64;
        if ledger_seq < expires_at {
            return Err(Error::CreditExpired);
        }

        let bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(member.clone()))
            .unwrap_or(0u128);

        let burn_amount = bal.min(credit.amount);
        if burn_amount == 0 {
            return Ok(0);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Balance(member.clone()), &(bal - burn_amount));

        let supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0u128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - burn_amount));

        // Clear the expiry record
        env.storage()
            .persistent()
            .remove(&DataKey::CreditExpiry(member.clone()));

        env.events()
            .publish((symbol_short!("expire"), member), burn_amount);
        Ok(burn_amount)
    }

    /// Audit all credit balances against total minted and report discrepancies.
    pub fn reconcile_credits(
        env: Env,
        members: soroban_sdk::Vec<Address>,
    ) -> Result<ReconciliationReport, Error> {
        let mut total_balance: u128 = 0;
        for i in 0..members.len() {
            let member = members.get_unchecked(i);
            let bal: u128 = env
                .storage()
                .persistent()
                .get(&DataKey::Balance(member))
                .unwrap_or(0u128);
            total_balance += bal;
        }

        let total_supply: u128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0u128);

        let mismatch = total_balance != total_supply;

        Ok(ReconciliationReport {
            total_balance,
            total_supply,
            mismatch,
        })
    }

    /// Return credits expiring within N days from now.
    ///
    /// `within_days` is converted to ledgers (assuming ~5s per ledger, ~17280 ledgers/day).
    pub fn get_expiring_credits(
        env: Env,
        members: soroban_sdk::Vec<Address>,
        within_days: u32,
    ) -> soroban_sdk::Vec<Credit> {
        let ledgers_per_day: u64 = 17_280;
        let cutoff = env.ledger().sequence() as u64 + (within_days as u64) * ledgers_per_day;

        let mut result = soroban_sdk::Vec::new(&env);
        for i in 0..members.len() {
            let member = members.get_unchecked(i);
            if let Some(credit) = env
                .storage()
                .persistent()
                .get::<DataKey, Credit>(&DataKey::CreditExpiry(member))
            {
                if let Some(expires_at) = credit.expires_at {
                    if expires_at <= cutoff {
                        result.push_back(credit);
                    }
                }
            }
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        let contract_id = env.register(ResourceCreditsContract, ());
        let admin = Address::generate(&env);
        let member = Address::generate(&env);
        (env, contract_id, admin, member)
    }

    #[test]
    fn test_initialize_and_mint() {
        let (env, contract_id, admin, member) = setup();
        env.as_contract(&contract_id, || {
            ResourceCreditsContract::initialize(env.clone(), admin.clone(), admin.clone()).unwrap();
            ResourceCreditsContract::mint_credits(
                env.clone(),
                admin.clone(),
                member.clone(),
                1000,
            )
            .unwrap();
            assert_eq!(ResourceCreditsContract::balance(env.clone(), member.clone()), 1000);
            assert_eq!(ResourceCreditsContract::total_supply(env.clone()), 1000);
        });
    }

    #[test]
    fn test_mint_with_expiry_and_expire() {
        let (env, contract_id, admin, member) = setup();
        env.as_contract(&contract_id, || {
            ResourceCreditsContract::initialize(env.clone(), admin.clone(), admin.clone()).unwrap();

            // Mint 500 credits expiring at ledger 10
            ResourceCreditsContract::mint_credits_with_expiry(
                env.clone(),
                admin.clone(),
                member.clone(),
                500,
                Some(10),
            )
            .unwrap();
            assert_eq!(
                ResourceCreditsContract::balance(env.clone(), member.clone()),
                500
            );

            // Ledger 5 < 10 => should fail to expire
            env.ledger().set(|l| l.sequence = 5);
            let result = ResourceCreditsContract::expire_credits(env.clone(), member.clone());
            assert_eq!(result.unwrap_err(), Error::CreditExpired);

            // Advance to ledger 10 => should expire
            env.ledger().set(|l| l.sequence = 10);
            let burned = ResourceCreditsContract::expire_credits(env.clone(), member.clone()).unwrap();
            assert_eq!(burned, 500);
            assert_eq!(ResourceCreditsContract::balance(env.clone(), member.clone()), 0);
            assert_eq!(ResourceCreditsContract::total_supply(env.clone()), 0);
        });
    }

    #[test]
    fn test_reconcile_credits_match() {
        let (env, contract_id, admin, member) = setup();
        env.as_contract(&contract_id, || {
            ResourceCreditsContract::initialize(env.clone(), admin.clone(), admin.clone()).unwrap();
            ResourceCreditsContract::mint_credits(
                env.clone(),
                admin.clone(),
                member.clone(),
                100,
            )
            .unwrap();

            let members = soroban_sdk::vec![&env, member.clone()];
            let report =
                ResourceCreditsContract::reconcile_credits(env.clone(), members).unwrap();
            assert!(!report.mismatch);
            assert_eq!(report.total_balance, 100);
            assert_eq!(report.total_supply, 100);
        });
    }

    #[test]
    fn test_get_expiring_credits() {
        let (env, contract_id, admin, member) = setup();
        env.as_contract(&contract_id, || {
            ResourceCreditsContract::initialize(env.clone(), admin.clone(), admin.clone()).unwrap();
            ResourceCreditsContract::mint_credits_with_expiry(
                env.clone(),
                admin.clone(),
                member.clone(),
                200,
                Some(50_000),
            )
            .unwrap();

            // 1 day = 17280 ledgers. 50000 is within 3 days from ledger 0
            let members = soroban_sdk::vec![&env, member.clone()];
            let expiring = ResourceCreditsContract::get_expiring_credits(
                env.clone(),
                members.clone(),
                3,
            );
            assert_eq!(expiring.len(), 1);
            assert_eq!(expiring.get_unchecked(0).amount, 200);

            // Not within 1 day (17280 ledgers)
            let not_expiring = ResourceCreditsContract::get_expiring_credits(
                env.clone(),
                members,
                1,
            );
            assert_eq!(not_expiring.len(), 0);
        });
    }

    #[test]
    fn test_transfer_and_spend() {
        let (env, contract_id, admin, member) = setup();
        let member2 = Address::generate(&env);
        env.as_contract(&contract_id, || {
            ResourceCreditsContract::initialize(env.clone(), admin.clone(), admin.clone()).unwrap();
            ResourceCreditsContract::mint_credits(
                env.clone(),
                admin.clone(),
                member.clone(),
                1000,
            )
            .unwrap();
            ResourceCreditsContract::transfer_credits(
                env.clone(),
                member.clone(),
                member2.clone(),
                300,
            )
            .unwrap();
            assert_eq!(ResourceCreditsContract::balance(env.clone(), member.clone()), 700);
            assert_eq!(ResourceCreditsContract::balance(env.clone(), member2.clone()), 300);
            ResourceCreditsContract::spend_credits(env.clone(), member.clone(), 200).unwrap();
            assert_eq!(ResourceCreditsContract::balance(env.clone(), member.clone()), 500);
            assert_eq!(ResourceCreditsContract::total_supply(env.clone()), 800);
        });
    }
