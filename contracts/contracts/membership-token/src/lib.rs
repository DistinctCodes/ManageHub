#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, Symbol, symbol_short, IntoVal
};

#[contract]
pub struct MembershipToken;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenInfo {
    pub name: String,
    pub symbol: String,
    pub decimals: u32,
    pub total_supply: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    TokenInfo,
    Balance(Address),
    Allowance(Address, Address),
    AccessControl,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 1,
    InsufficientAllowance = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    AccessControlNotSet = 5,
}

pub mod access_control_interface {
    use soroban_sdk::{contracttype, Address, String};

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct QueryMsg {
        pub check_access: CheckAccessQuery,
    }

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct CheckAccessQuery {
        pub caller: Address,
        pub required_role: String,
    }

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct AccessResponse {
        pub has_access: bool,
    }
}

#[contractimpl]
impl MembershipToken {
    pub fn initialize(
        env: Env,
        name: String,
        symbol: String,
        decimals: u32,
        access_control_contract: Address,
    ) -> Result<(), Error> {
        let token_info = TokenInfo {
            name,
            symbol,
            decimals,
            total_supply: 0,
        };

        env.storage().instance().set(&DataKey::TokenInfo, &token_info);
        env.storage().instance().set(&DataKey::AccessControl, &access_control_contract);

        Ok(())
    }

    pub fn mint(env: Env, caller: Address, to: Address, amount: i128) -> Result<(), Error> {
        caller.require_auth();

        // Check if caller has minter role
        Self::check_access(&env, &caller, &String::from_str(&env, "Minter"))?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut token_info = Self::get_token_info(&env)?;
        let current_balance = Self::get_balance(&env, &to);

        env.storage().instance().set(&DataKey::Balance(to.clone()), &(current_balance + amount));
        token_info.total_supply += amount;
        env.storage().instance().set(&DataKey::TokenInfo, &token_info);

        env.events().publish((symbol_short!("mint"), to, amount), ());

        Ok(())
    }

    pub fn transfer(env: Env, caller: Address, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        caller.require_auth();

        // Check if caller is the owner or has transfer permission
        if caller != from {
            Self::check_access(&env, &caller, &String::from_str(&env, "Transferer"))?;
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let from_balance = Self::get_balance(&env, &from);
        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_balance = Self::get_balance(&env, &to);

        env.storage().instance().set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage().instance().set(&DataKey::Balance(to.clone()), &(to_balance + amount));

        env.events().publish((symbol_short!("transfer"), from, to, amount), ());

        Ok(())
    }

    pub fn approve(env: Env, owner: Address, spender: Address, amount: i128) -> Result<(), Error> {
        owner.require_auth();

        if amount < 0 {
            return Err(Error::InvalidAmount);
        }

        env.storage().instance().set(&DataKey::Allowance(owner.clone(), spender.clone()), &amount);

        env.events().publish((symbol_short!("approve"), owner, spender, amount), ());

        Ok(())
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        spender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let allowance = Self::get_allowance(&env, &from, &spender);
        if allowance < amount {
            return Err(Error::InsufficientAllowance);
        }

        let from_balance = Self::get_balance(&env, &from);
        if from_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let to_balance = Self::get_balance(&env, &to);

        env.storage().instance().set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        env.storage().instance().set(&DataKey::Balance(to.clone()), &(to_balance + amount));
        env.storage().instance().set(&DataKey::Allowance(from.clone(), spender.clone()), &(allowance - amount));

        env.events().publish((symbol_short!("transfer"), from, to, amount), ());

        Ok(())
    }

    pub fn balance_of(env: Env, account: Address) -> i128 {
        Self::get_balance(&env, &account)
    }

    pub fn allowance(env: Env, owner: Address, spender: Address) -> i128 {
        Self::get_allowance(&env, &owner, &spender)
    }

    pub fn total_supply(env: Env) -> Result<i128, Error> {
        let token_info = Self::get_token_info(&env)?;
        Ok(token_info.total_supply)
    }

    pub fn token_info(env: Env) -> Result<TokenInfo, Error> {
        Self::get_token_info(&env)
    }

    fn get_token_info(env: &Env) -> Result<TokenInfo, Error> {
        env.storage().instance().get(&DataKey::TokenInfo).ok_or(Error::Unauthorized)
    }

    fn get_balance(env: &Env, account: &Address) -> i128 {
        env.storage().instance().get(&DataKey::Balance(account.clone())).unwrap_or(0)
    }

    fn get_allowance(env: &Env, owner: &Address, spender: &Address) -> i128 {
        env.storage().instance().get(&DataKey::Allowance(owner.clone(), spender.clone())).unwrap_or(0)
    }

    fn check_access(env: &Env, caller: &Address, required_role: &String) -> Result<(), Error> {
        let access_control_contract: Address = env.storage().instance()
            .get(&DataKey::AccessControl)
            .ok_or(Error::AccessControlNotSet)?;

        let query = access_control_interface::QueryMsg {
            check_access: access_control_interface::CheckAccessQuery {
                caller: caller.clone(),
                required_role: required_role.clone(),
            },
        };

        let response: access_control_interface::AccessResponse = env
            .invoke_contract(&access_control_contract, &Symbol::new(env, "check_access"), Vec::from_array(env, [query.into_val(env)]));

        if response.has_access {
            Ok(())
        } else {
            Err(Error::Unauthorized)
        }
    }
}

mod test;