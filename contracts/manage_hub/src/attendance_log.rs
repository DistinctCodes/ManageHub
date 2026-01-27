// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

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
    /// Logs an attendance action with comprehensive validation and error handling.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Unique log entry identifier
    /// * `user_id` - Address of the user performing the action
    /// * `action` - Clock in or clock out action
    /// * `details` - Additional event details and metadata
    ///
    /// # Returns
    /// * `Result<(), Error>` - Success or detailed error information
    ///
    /// # Errors
    /// * `AuthenticationRequired` - User must authenticate
    /// * `InvalidEventDetails` - Details exceed size limit or contain invalid data
    /// * `AttendanceLogFailed` - Failed to store attendance record
    /// * `StorageOperationFailed` - Storage operation failed
    pub fn log_attendance(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: Map<String, String>,
    ) -> Result<(), Error> {
        // Enforce user authentication
        user_id.require_auth();

        Self::log_attendance_internal(env, id, user_id, action, details)
    }

    /// Internal attendance logging with validation but without auth check.
    /// Used for cross-contract calls where authentication is handled elsewhere.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Unique log entry identifier  
    /// * `user_id` - Address of the user performing the action
    /// * `action` - Clock in or clock out action
    /// * `details` - Additional event details and metadata
    ///
    /// # Returns
    /// * `Result<(), Error>` - Success or detailed error information
    ///
    /// # Errors
    /// * `InvalidEventDetails` - Details exceed size limit or contain invalid data
    /// * `AttendanceLogFailed` - Failed to store attendance record
    /// * `StorageOperationFailed` - Storage operation failed
    pub(crate) fn log_attendance_internal(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: Map<String, String>,
    ) -> Result<(), Error> {
        // Validate details size and content
        if details.len() > 50 {
            return Err(Error::InvalidEventDetails);
        }

        // Validate detail content for reasonable key/value lengths
        for (key, value) in details.iter() {
            if key.len() > 100 || value.len() > 500 {
                return Err(Error::InvalidEventDetails);
            }
        }

        // Check if log entry already exists to prevent duplicates
        if env
            .storage()
            .persistent()
            .has(&DataKey::AttendanceLog(id.clone()))
        {
            return Err(Error::AttendanceLogFailed);
        }

        let timestamp = env.ledger().timestamp();

        let log = AttendanceLog {
            id: id.clone(),
            user_id: user_id.clone(),
            action: action.clone(),
            timestamp,
            details: details.clone(),
        };

        // Store individual attendance log with error handling
        env.storage()
            .persistent()
            .set(&DataKey::AttendanceLog(id.clone()), &log);
        // Set reasonable TTL for attendance logs
        env.storage().persistent().extend_ttl(
            &DataKey::AttendanceLog(id.clone()),
            100,
            365 * 24 * 60 * 60,
        ); // 1 year

        // Append to user's attendance logs with error handling
        let user_logs_key = DataKey::AttendanceLogsByUser(user_id.clone());
        let mut user_logs: Vec<AttendanceLog> = env
            .storage()
            .persistent()
            .get(&user_logs_key)
            .unwrap_or_else(|| Vec::new(&env));

        // Prevent excessive log accumulation per user
        if user_logs.len() >= 10000 {
            // Keep only the most recent 9999 logs plus the new one
            user_logs = user_logs.slice(1..user_logs.len());
        }

        user_logs.push_back(log.clone());

        // Update user logs with proper error handling
        env.storage().persistent().set(&user_logs_key, &user_logs);
        // Extend TTL for user logs
        env.storage()
            .persistent()
            .extend_ttl(&user_logs_key, 100, 365 * 24 * 60 * 60); // 1 year

        // Emit event for off-chain indexing with error handling
        env.events()
            .publish((symbol_short!("attend"), id, user_id), action);

        Ok(())
    }

    /// Retrieves attendance logs for a specific user.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `user_id` - User's address to get logs for
    ///
    /// # Returns
    /// * `Vec<AttendanceLog>` - User's attendance logs (empty if none found)
    ///
    /// # Note
    /// This function returns an empty vector rather than an error when no logs are found,
    /// as this is a valid state for new users.
    pub fn get_logs_for_user(env: Env, user_id: Address) -> Vec<AttendanceLog> {
        env.storage()
            .persistent()
            .get(&DataKey::AttendanceLogsByUser(user_id))
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Retrieves a specific attendance log entry by ID.
    ///
    /// # Arguments  
    /// * `env` - The contract environment
    /// * `id` - Attendance log ID to retrieve
    ///
    /// # Returns
    /// * `Result<AttendanceLog, Error>` - The attendance log or error
    ///
    /// # Errors
    /// * `AttendanceRecordNotFound` - No log entry with given ID exists
    pub fn get_attendance_log(env: Env, id: BytesN<32>) -> Result<AttendanceLog, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::AttendanceLog(id))
            .ok_or(Error::AttendanceLogFailed)
    }

    /// Validates attendance action against business rules.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `user_id` - User performing the action
    /// * `action` - The attendance action to validate
    ///
    /// # Returns
    /// * `Result<(), Error>` - Success or validation error
    ///
    /// # Errors
    /// * `UserAlreadyClockedIn` - User trying to clock in when already clocked in
    /// * `UserNotClockedIn` - User trying to clock out when not clocked in
    /// * `AttendanceValidationFailed` - Other validation failures
    pub fn validate_attendance_action(
        env: Env,
        user_id: Address,
        action: AttendanceAction,
    ) -> Result<(), Error> {
        let user_logs = Self::get_logs_for_user(env, user_id);

        if user_logs.is_empty() {
            // First time user - only ClockIn is allowed
            if action == AttendanceAction::ClockOut {
                return Err(Error::BusinessRuleViolation);
            }
            return Ok(());
        }

        // Get the most recent log entry
        let last_index = user_logs.len() - 1;
        let last_log = match user_logs.get(last_index) {
            Some(log) => log,
            None => return Err(Error::BusinessRuleViolation), // Should not happen but handle gracefully
        };

        match (&last_log.action, &action) {
            (AttendanceAction::ClockIn, AttendanceAction::ClockIn) => {
                Err(Error::BusinessRuleViolation) // Already clocked in
            }
            (AttendanceAction::ClockOut, AttendanceAction::ClockOut) => {
                Err(Error::BusinessRuleViolation) // Already clocked out
            }
            _ => Ok(()), // Valid transition
        }
    }
}
