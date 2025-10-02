use crate::errors::Error;
use crate::types::AttendanceAction;
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    AttendanceLog(BytesN<32>),
    AttendanceLogsByUser(Address),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AttendanceLog {
    pub id: BytesN<32>,
    pub user_id: Address,
    pub action: AttendanceAction,
    pub timestamp: u64,
    pub details: Map<String, String>,
}

pub struct AttendanceLogModule;

impl AttendanceLogModule {
    pub fn log_attendance(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: Map<String, String>,
    ) -> Result<(), Error> {
        // Enforce initiator authentication
        user_id.require_auth();

        // Validate details size
        if details.len() > 50 {
            return Err(Error::InvalidEventDetails);
        }

        let timestamp = env.ledger().timestamp();

        let log = AttendanceLog {
            id: id.clone(),
            user_id: user_id.clone(),
            action: action.clone(),
            timestamp,
            details: details.clone(),
        };

        // Store individual attendance log immutably
        env.storage()
            .persistent()
            .set(&DataKey::AttendanceLog(id.clone()), &log);

        // Append to user's attendance logs
        let mut user_logs: Vec<AttendanceLog> = env
            .storage()
            .persistent()
            .get(&DataKey::AttendanceLogsByUser(user_id.clone()))
            .unwrap_or(Vec::new(&env));
        user_logs.push_back(log.clone());
        env.storage()
            .persistent()
            .set(&DataKey::AttendanceLogsByUser(user_id.clone()), &user_logs);

        // Emit event for off-chain indexing
        env.events()
            .publish((symbol_short!("attend"), id, user_id), action);

        Ok(())
    }

    pub fn get_logs_for_user(env: Env, user_id: Address) -> Vec<AttendanceLog> {
        env.storage()
            .persistent()
            .get(&DataKey::AttendanceLogsByUser(user_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_attendance_log(env: Env, id: BytesN<32>) -> Option<AttendanceLog> {
        env.storage()
            .persistent()
            .get(&DataKey::AttendanceLog(id))
    }
}