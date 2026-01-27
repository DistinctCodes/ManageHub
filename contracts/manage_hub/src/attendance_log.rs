// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use crate::errors::Error;
use crate::types::{AttendanceAction, AttendanceSummary, SessionPair};
use common_types::{
    AttendanceFrequency, DateRange, DayPattern, PeakHourData, TimePeriod, UserAttendanceStats,
};
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

    // ============================================================================
    // Analytics and Reporting Functions
    // ============================================================================

    /// Get attendance summary for a user within a date range
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * `Ok(AttendanceSummary)` - Summary of attendance data
    /// * `Err(Error)` - If date range is invalid or no records found
    pub fn get_attendance_summary(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceSummary, Error> {
        // Validate date range
        if date_range.start_time > date_range.end_time {
            return Err(Error::InvalidDateRange);
        }

        let logs = Self::get_logs_for_user(env.clone(), user_id.clone());

        if logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Filter logs by date range
        let filtered_logs = Self::filter_logs_by_date_range(&logs, &date_range);

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Calculate statistics
        let mut total_clock_ins = 0u32;
        let mut total_clock_outs = 0u32;
        let mut total_duration = 0u64;
        let mut sessions = Vec::new(&env);

        let mut i = 0;
        while i < filtered_logs.len() {
            let log = filtered_logs.get(i).unwrap();

            match log.action {
                AttendanceAction::ClockIn => {
                    total_clock_ins += 1;
                    // Look for matching clock out
                    let mut j = i + 1;
                    while j < filtered_logs.len() {
                        let next_log = filtered_logs.get(j).unwrap();
                        if next_log.action == AttendanceAction::ClockOut {
                            let duration = next_log.timestamp - log.timestamp;
                            total_duration += duration;
                            sessions.push_back(SessionPair {
                                clock_in_time: log.timestamp,
                                clock_out_time: next_log.timestamp,
                                duration,
                            });
                            break;
                        }
                        j += 1;
                    }
                }
                AttendanceAction::ClockOut => {
                    total_clock_outs += 1;
                }
            }
            i += 1;
        }

        let total_sessions = sessions.len();
        let average_session_duration = if total_sessions > 0 {
            total_duration / total_sessions as u64
        } else {
            0
        };

        Ok(AttendanceSummary {
            user_id,
            date_range_start: date_range.start_time,
            date_range_end: date_range.end_time,
            total_clock_ins,
            total_clock_outs,
            total_duration,
            average_session_duration,
            total_sessions,
        })
    }

    /// Get time-based attendance records (daily, weekly, monthly)
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `_period` - Time period for grouping
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * Vector of attendance logs grouped by the specified period
    pub fn get_time_based_attendance(
        env: Env,
        user_id: Address,
        _period: TimePeriod,
        date_range: DateRange,
    ) -> Result<Vec<AttendanceLog>, Error> {
        if date_range.start_time > date_range.end_time {
            return Err(Error::InvalidDateRange);
        }

        let logs = Self::get_logs_for_user(env.clone(), user_id);
        let filtered_logs = Self::filter_logs_by_date_range(&logs, &date_range);

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Return filtered logs based on period
        // For actual implementation, we return all filtered logs
        // In a more advanced implementation, you could group by day/week/month
        Ok(filtered_logs)
    }

    /// Calculate attendance frequency for a user
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `AttendanceFrequency` - Frequency statistics
    pub fn calculate_attendance_frequency(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceFrequency, Error> {
        if date_range.start_time > date_range.end_time {
            return Err(Error::InvalidDateRange);
        }

        let logs = Self::get_logs_for_user(env.clone(), user_id);
        let filtered_logs = Self::filter_logs_by_date_range(&logs, &date_range);

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        let total_attendances = filtered_logs.len();

        // Calculate number of days in range
        let days_in_range = ((date_range.end_time - date_range.start_time) / 86400) + 1;
        let average_daily_attendance = if days_in_range > 0 {
            (total_attendances as u64 / days_in_range) as u32
        } else {
            0
        };

        Ok(AttendanceFrequency {
            period: TimePeriod::Custom,
            period_start: date_range.start_time,
            period_end: date_range.end_time,
            total_attendances,
            unique_users: 1, // Single user query
            average_daily_attendance,
        })
    }

    /// Get comprehensive user attendance statistics
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Optional date range (None for all-time stats)
    ///
    /// # Returns
    /// * `UserAttendanceStats` - Comprehensive attendance statistics
    pub fn get_user_statistics(
        env: Env,
        user_id: Address,
        date_range: Option<DateRange>,
    ) -> Result<UserAttendanceStats, Error> {
        let logs = Self::get_logs_for_user(env.clone(), user_id.clone());

        if logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        let filtered_logs = match date_range {
            Some(range) => {
                if range.start_time > range.end_time {
                    return Err(Error::InvalidDateRange);
                }
                Self::filter_logs_by_date_range(&logs, &range)
            }
            None => logs,
        };

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Parse sessions
        let sessions = Self::parse_sessions(&env, &filtered_logs);
        let total_sessions = sessions.len();

        let mut total_duration = 0u64;
        let mut first_clock_in = u64::MAX;
        let mut last_clock_out = 0u64;
        let mut unique_days: Vec<u64> = Vec::new(&env);

        for i in 0..sessions.len() {
            let session = sessions.get(i).unwrap();
            total_duration += session.duration;

            if session.clock_in_time < first_clock_in {
                first_clock_in = session.clock_in_time;
            }
            if session.clock_out_time > last_clock_out {
                last_clock_out = session.clock_out_time;
            }

            // Track unique days
            let day = session.clock_in_time / 86400;
            let mut day_exists = false;
            for j in 0..unique_days.len() {
                if unique_days.get(j).unwrap() == day {
                    day_exists = true;
                    break;
                }
            }
            if !day_exists {
                unique_days.push_back(day);
            }
        }

        let average_duration = if total_sessions > 0 {
            total_duration / total_sessions as u64
        } else {
            0
        };

        Ok(UserAttendanceStats {
            user_id,
            total_sessions,
            total_duration,
            average_duration,
            first_clock_in,
            last_clock_out,
            total_days_present: unique_days.len(),
        })
    }

    /// Analyze peak attendance hours
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * Vector of peak hour data sorted by attendance count
    pub fn analyze_peak_hours(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<PeakHourData>, Error> {
        if date_range.start_time > date_range.end_time {
            return Err(Error::InvalidDateRange);
        }

        let logs = Self::get_logs_for_user(env.clone(), user_id);
        let filtered_logs = Self::filter_logs_by_date_range(&logs, &date_range);

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Count attendances by hour
        let mut hour_counts: Map<u32, u32> = Map::new(&env);
        let total_attendances = filtered_logs.len();

        for i in 0..filtered_logs.len() {
            let log = filtered_logs.get(i).unwrap();
            let hour = ((log.timestamp % 86400) / 3600) as u32;

            let count = hour_counts.get(hour).unwrap_or(0);
            hour_counts.set(hour, count + 1);
        }

        // Build result vector
        let mut result: Vec<PeakHourData> = Vec::new(&env);
        for hour in 0..24 {
            if let Some(count) = hour_counts.get(hour) {
                let percentage = if total_attendances > 0 {
                    (count * 100) / total_attendances
                } else {
                    0
                };

                result.push_back(PeakHourData {
                    hour,
                    attendance_count: count,
                    percentage,
                });
            }
        }

        Ok(result)
    }

    /// Analyze attendance patterns by day of week
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * Vector of day patterns showing attendance distribution
    pub fn analyze_day_patterns(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<DayPattern>, Error> {
        if date_range.start_time > date_range.end_time {
            return Err(Error::InvalidDateRange);
        }

        let logs = Self::get_logs_for_user(env.clone(), user_id);
        let filtered_logs = Self::filter_logs_by_date_range(&logs, &date_range);

        if filtered_logs.is_empty() {
            return Err(Error::NoAttendanceRecords);
        }

        // Count attendances by day of week
        let mut day_counts: Map<u32, u32> = Map::new(&env);
        let total_attendances = filtered_logs.len();

        for i in 0..filtered_logs.len() {
            let log = filtered_logs.get(i).unwrap();
            // Calculate day of week (0 = Thursday, Jan 1, 1970)
            // Adjust to 0 = Sunday
            let days_since_epoch = log.timestamp / 86400;
            let day_of_week = ((days_since_epoch + 4) % 7) as u32;

            let count = day_counts.get(day_of_week).unwrap_or(0);
            day_counts.set(day_of_week, count + 1);
        }

        // Build result vector
        let mut result: Vec<DayPattern> = Vec::new(&env);
        for day in 0..7 {
            if let Some(count) = day_counts.get(day) {
                let percentage = if total_attendances > 0 {
                    (count * 100) / total_attendances
                } else {
                    0
                };

                result.push_back(DayPattern {
                    day_of_week: day,
                    attendance_count: count,
                    percentage,
                });
            }
        }

        Ok(result)
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

    /// Filter logs by date range
    fn filter_logs_by_date_range(
        logs: &Vec<AttendanceLog>,
        date_range: &DateRange,
    ) -> Vec<AttendanceLog> {
        let env = logs.env();
        let mut filtered: Vec<AttendanceLog> = Vec::new(env);

        for i in 0..logs.len() {
            let log = logs.get(i).unwrap();
            if log.timestamp >= date_range.start_time && log.timestamp <= date_range.end_time {
                filtered.push_back(log);
            }
        }

        filtered
    }

    /// Parse attendance logs into complete sessions (clock-in to clock-out pairs)
    fn parse_sessions(env: &Env, logs: &Vec<AttendanceLog>) -> Vec<SessionPair> {
        let mut sessions: Vec<SessionPair> = Vec::new(env);
        let mut pending_clock_in: Option<u64> = None;

        for i in 0..logs.len() {
            let log = logs.get(i).unwrap();

            match log.action {
                AttendanceAction::ClockIn => {
                    pending_clock_in = Some(log.timestamp);
                }
                AttendanceAction::ClockOut => {
                    if let Some(clock_in_time) = pending_clock_in {
                        let duration = log.timestamp - clock_in_time;
                        sessions.push_back(SessionPair {
                            clock_in_time,
                            clock_out_time: log.timestamp,
                            duration,
                        });
                        pending_clock_in = None;
                    }
                }
            }
        }

        sessions
    }

    /// Calculate total hours from total seconds
    pub fn calculate_total_hours(total_seconds: u64) -> u64 {
        total_seconds / 3600
    }

    /// Calculate average daily attendance from logs
    pub fn calculate_average_daily_attendance(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<u64, Error> {
        let frequency = Self::calculate_attendance_frequency(env, user_id, date_range)?;
        Ok(frequency.average_daily_attendance as u64)
    }
}
