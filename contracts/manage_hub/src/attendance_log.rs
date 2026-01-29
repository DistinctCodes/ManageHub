// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use crate::errors::Error;
use crate::types::AttendanceAction;
use common_types::{AttendanceLogRequest, BatchAttendanceResult, BatchOperationStatus};
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
    pub fn batch_log_attendance(
        env: Env,
        logs: Vec<AttendanceLogRequest>,
    ) -> Result<Vec<BatchAttendanceResult>, Error> {
        // Enforce batch size limit
        if logs.len() > 100 {
            return Err(Error::InvalidBatchSize);
        }

        let mut results: Vec<BatchAttendanceResult> = Vec::new(&env);

        for log_req in logs.iter() {
            // Enforce initiator authentication for each log
            // Note: In a real batch scenario, the caller might be an admin logging for others,
            // or the user themselves. If it's the user, they must sign.
            // For this implementation, we assume the caller must be authorized for the user_id
            // specified in the request, or we could check if the caller is an admin.
            // However, `log_attendance` enforces `user_id.require_auth()`.
            // We will stick to `user_id.require_auth()` for now as per the single log implementation.
            // If the user submits a batch for themselves, this works.
            // If an admin submits for multiple users, this would fail unless we have admin override logic.
            // Given the requirements don't specify admin override for attendance, we strictly follow
            // the existing pattern or we can relax it if needed.
            // "Implement batch ... logging ... or managing multiple user roles"
            // Usually batch attendance is for a kiosk or admin.
            // But let's look at `log_attendance`: `user_id.require_auth()`.
            // If we want to allow batch logging by an admin, we might need to check admin status.
            // But `log_attendance` doesn't check admin.
            // Let's rely on `require_auth` for now. If it fails, we mark as failed.

            // Actually, we can't easily "try" require_auth without panicking in the current Soroban version
            // unless we are careful. But `require_auth` panics on failure.
            // So we can assume the batch is submitted by someone who has auth over these keys (e.g. multi-sig or single user).
            // OR we assume this is an admin function?
            // "Batch Attendance Logging - Implement batch attendance operations... optimized storage patterns"
            // Let's implement it such that it tries to log. If `require_auth` fails, the whole tx fails (standard Soroban).
            // Partial success is only for logic errors we can catch.
            // But wait, `log_attendance` takes `user_id`.
            // If I am a teacher logging for students, I need admin rights.
            // The current `log_attendance` enforces `user_id.require_auth()`, meaning ONLY the user can log their own attendance.
            // This suggests the batch is for a user logging multiple times (weird) OR the requirements imply we should allow an admin to log for others.
            // However, I should stick to the requested changes.
            // Let's look at the requirements: "Batch attendance operations".
            // I will implement it such that it calls `require_auth` on the user_id.
            // If this is not desired, the underlying `log_attendance` would need changing too.
            // Wait, if I do `require_auth` inside the loop, and one fails, the whole batch fails.
            // To support partial success for AUHTORIZATION failures is hard in smart contracts without signature verification libraries.
            // We will assume the batch transaction is signed by all necessary parties or the caller has the authority.
            // But for this specific task, I'll assume we just loop and call internal logic.

            // ERROR: logic inside loop using `require_auth` will panic if not signed.
            // If we want "Partial Success", we should probably catch errors that are NOT auth errors.
            // e.g. details too long.

            // Let's look at `log_attendance_internal`. It does validation.
            // We can call that.
            // But we need to handle auth.
            // If we blindly call `log_attendance_internal`, we bypass auth.
            // So we MUST check auth.
            // Implementation decision: enforce auth on `user_id`.
            log_req.user_id.require_auth();

            match Self::log_attendance_internal(
                env.clone(),
                log_req.id.clone(),
                log_req.user_id.clone(),
                log_req.action,
                log_req.details,
            ) {
                Ok(_) => {
                    results.push_back(BatchAttendanceResult {
                        id: log_req.id,
                        status: BatchOperationStatus::Success,
                        error: String::from_str(&env, ""),
                    });
                }
                Err(e) => {
                    // Map error to string (simplified for this context)
                    let err_msg = match e {
                        Error::InvalidEventDetails => "Invalid details",
                        _ => "Unknown error",
                    };
                    results.push_back(BatchAttendanceResult {
                        id: log_req.id,
                        status: BatchOperationStatus::Failed,
                        error: String::from_str(&env, err_msg),
                    });
                }
            }
        }

        // Emit batch summary event
        env.events()
            .publish((symbol_short!("batch_att"), logs.len()), results.len());

        Ok(results)
    }

    pub fn log_attendance(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: Map<String, String>,
    ) -> Result<(), Error> {
        // Enforce initiator authentication
        user_id.require_auth();

        Self::log_attendance_internal(env, id, user_id, action, details)
    }

    /// Internal version without auth check for cross-contract calls
    pub(crate) fn log_attendance_internal(
        env: Env,
        id: BytesN<32>,
        user_id: Address,
        action: AttendanceAction,
        details: Map<String, String>,
    ) -> Result<(), Error> {
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
        env.storage().persistent().get(&DataKey::AttendanceLog(id))
    }
}
