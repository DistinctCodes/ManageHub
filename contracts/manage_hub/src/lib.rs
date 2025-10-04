#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, String, Vec};

mod attendance_log;
mod errors;
mod membership_token;
mod subscription;
mod types;

use attendance_log::{AttendanceLog, AttendanceLogModule};
use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};
use subscription::SubscriptionContract;
use types::{AttendanceAction, Subscription};

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

    pub fn log_attendance(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: soroban_sdk::Map<String, String>,
    ) -> Result<(), Error> {
        AttendanceLogModule::log_attendance(env, id, user_id, action, details)
    }

    pub fn get_logs_for_user(env: Env, user_id: Address) -> Vec<AttendanceLog> {
        AttendanceLogModule::get_logs_for_user(env, user_id)
    }

    pub fn get_attendance_log(env: Env, id: BytesN<32>) -> Option<AttendanceLog> {
        AttendanceLogModule::get_attendance_log(env, id)
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

    pub fn renew_subscription(
        env: Env,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        SubscriptionContract::renew_subscription(env, id, payment_token, amount, duration)
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        SubscriptionContract::get_subscription(env, id)
    }

    pub fn cancel_subscription(env: Env, id: String) -> Result<(), Error> {
        SubscriptionContract::cancel_subscription(env, id)
    }

    pub fn set_usdc_contract(env: Env, admin: Address, usdc_address: Address) -> Result<(), Error> {
        SubscriptionContract::set_usdc_contract(env, admin, usdc_address)
    }
}

mod test;
