#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, String, Vec};

mod attendance_log;
mod errors;
mod types;

use attendance_log::{AttendanceLog, AttendanceLogModule};
use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};

use types::AttendanceAction;

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
        MembershipTokenContract::issue_token(env, id, user, expiry_date)?;
        Ok(())
    }

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        MembershipTokenContract::transfer_token(env, id, new_user)?;
        Ok(())
    }

    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        Ok(MembershipTokenContract::get_token(env, id)?)
    }

    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        MembershipTokenContract::set_admin(env, admin)?;
        Ok(())
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
}

mod test;
