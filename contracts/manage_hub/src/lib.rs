#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, String, Vec};

mod errors;
mod membership_token;
mod subscription;
mod types;

use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};
use subscription::SubscriptionContract;
use types::Subscription;

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

    // Subscription management functions
    pub fn validate_payment(
        env: Env,
        payment_token: Address,
        amount: i128,
        payer: Address,
    ) -> Result<bool, Error> {
        SubscriptionContract::validate_payment(env, payment_token, amount, payer)
    }

    pub fn create_subscription(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        SubscriptionContract::create_subscription(env, id, user, payment_token, amount, duration)
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        SubscriptionContract::get_subscription(env, id)
    }

    pub fn set_usdc_contract(env: Env, admin: Address, usdc_address: Address) -> Result<(), Error> {
        SubscriptionContract::set_usdc_contract(env, admin, usdc_address)
    }
}

mod test;
