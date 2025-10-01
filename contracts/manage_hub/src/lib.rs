#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, String, Vec};

mod errors;
mod membership_token;
mod types;

pub use errors::Error;
use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    pub fn hello(env: Env, to: String) -> Vec<String> {
        vec![&env, String::from_str(&env, "Hello"), to]
    }

    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        MembershipTokenContract::issue_token(env, id, user, expiry_date)
    }

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        MembershipTokenContract::transfer_token(env, id, new_user)
    }

    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        MembershipTokenContract::get_token(env, id)
    }

    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        MembershipTokenContract::set_admin(env, admin)
    }
}

mod test;
