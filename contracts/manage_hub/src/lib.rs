#![no_std]
use soroban_sdk::{contract, contractimpl, vec, Address, BytesN, Env, Map, String, Vec};

mod attendance_log;
mod errors;
mod membership_token;
mod subscription;
mod types;

use attendance_log::{AttendanceLog, AttendanceLogModule};
use common_types::{
    AttendanceFrequency, DateRange, DayPattern, MetadataUpdate, MetadataValue, PeakHourData,
    TimePeriod, TokenMetadata, UserAttendanceStats,
};
use errors::Error;
use membership_token::{MembershipToken, MembershipTokenContract};
use subscription::SubscriptionContract;
use types::{AttendanceAction, AttendanceSummary, Subscription};

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
        MembershipTokenContract::get_token(env, id)
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

    // ============================================================================
    // Token Metadata Endpoints
    // ============================================================================

    /// Sets metadata for a membership token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to set metadata for
    /// * `description` - Token description (max 500 chars)
    /// * `attributes` - Custom attributes map (max 20 attributes)
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `Unauthorized` - Caller is not admin or token owner
    /// * `MetadataValidationFailed` - Metadata validation failed
    pub fn set_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        description: String,
        attributes: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        MembershipTokenContract::set_token_metadata(env, token_id, description, attributes)
    }

    /// Gets metadata for a membership token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get metadata for
    ///
    /// # Returns
    /// * `Ok(TokenMetadata)` - The token metadata
    /// * `Err(Error)` - If token or metadata not found
    pub fn get_token_metadata(env: Env, token_id: BytesN<32>) -> Result<TokenMetadata, Error> {
        MembershipTokenContract::get_token_metadata(env, token_id)
    }

    /// Updates specific attributes in token metadata.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to update metadata for
    /// * `updates` - Map of attributes to add or update
    ///
    /// # Errors
    /// * `TokenNotFound` - Token doesn't exist
    /// * `MetadataNotFound` - Metadata doesn't exist
    /// * `Unauthorized` - Caller is not admin or token owner
    pub fn update_token_metadata(
        env: Env,
        token_id: BytesN<32>,
        updates: Map<String, MetadataValue>,
    ) -> Result<(), Error> {
        MembershipTokenContract::update_token_metadata(env, token_id, updates)
    }

    /// Gets the metadata update history for a token.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to get history for
    ///
    /// # Returns
    /// * Vector of metadata updates in chronological order
    pub fn get_metadata_history(env: Env, token_id: BytesN<32>) -> Vec<MetadataUpdate> {
        MembershipTokenContract::get_metadata_history(env, token_id)
    }

    /// Removes specific attributes from token metadata.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to remove attributes from
    /// * `attribute_keys` - Vector of attribute keys to remove
    pub fn remove_metadata_attributes(
        env: Env,
        token_id: BytesN<32>,
        attribute_keys: Vec<String>,
    ) -> Result<(), Error> {
        MembershipTokenContract::remove_metadata_attributes(env, token_id, attribute_keys)
    }

    /// Queries tokens by metadata attribute.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `attribute_key` - The attribute key to search for
    /// * `attribute_value` - The attribute value to match
    ///
    /// # Returns
    /// * Vector of token IDs that have the matching attribute
    pub fn query_tokens_by_attribute(
        env: Env,
        attribute_key: String,
        attribute_value: MetadataValue,
    ) -> Vec<BytesN<32>> {
        MembershipTokenContract::query_tokens_by_attribute(env, attribute_key, attribute_value)
    }

    // ============================================================================
    // Attendance Analytics Endpoints
    // ============================================================================

    /// Get attendance summary for a user within a date range.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * `Ok(AttendanceSummary)` - Summary with clock-ins, clock-outs, duration stats
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_attendance_summary(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceSummary, Error> {
        AttendanceLogModule::get_attendance_summary(env, user_id, date_range)
    }

    /// Get time-based attendance records (daily, weekly, monthly).
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `period` - Time period for grouping (Daily, Weekly, Monthly, Custom)
    /// * `date_range` - Date range to filter records
    ///
    /// # Returns
    /// * `Ok(Vec<AttendanceLog>)` - Filtered attendance logs for the period
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_time_based_attendance(
        env: Env,
        user_id: Address,
        period: TimePeriod,
        date_range: DateRange,
    ) -> Result<Vec<AttendanceLog>, Error> {
        AttendanceLogModule::get_time_based_attendance(env, user_id, period, date_range)
    }

    /// Calculate attendance frequency for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(AttendanceFrequency)` - Frequency metrics including total, average daily
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn calculate_attendance_frequency(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<AttendanceFrequency, Error> {
        AttendanceLogModule::calculate_attendance_frequency(env, user_id, date_range)
    }

    /// Get comprehensive user attendance statistics.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Optional date range (None for all-time stats)
    ///
    /// # Returns
    /// * `Ok(UserAttendanceStats)` - Comprehensive stats including total hours,
    ///   average attendance, session counts, and date ranges
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time (if range provided)
    /// * `NoAttendanceRecords` - No records found for user
    pub fn get_user_statistics(
        env: Env,
        user_id: Address,
        date_range: Option<DateRange>,
    ) -> Result<UserAttendanceStats, Error> {
        AttendanceLogModule::get_user_statistics(env, user_id, date_range)
    }

    /// Analyze peak attendance hours for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(Vec<PeakHourData>)` - Peak hour analysis showing attendance count
    ///   and percentage per hour
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn analyze_peak_hours(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<PeakHourData>, Error> {
        AttendanceLogModule::analyze_peak_hours(env, user_id, date_range)
    }

    /// Analyze attendance patterns by day of week.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(Vec<DayPattern>)` - Day patterns showing attendance distribution
    ///   across days of the week with counts and percentages
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn analyze_day_patterns(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<Vec<DayPattern>, Error> {
        AttendanceLogModule::analyze_day_patterns(env, user_id, date_range)
    }

    /// Calculate total hours from seconds.
    ///
    /// # Arguments
    /// * `total_seconds` - Total seconds to convert
    ///
    /// # Returns
    /// * Total hours (rounded down)
    pub fn calculate_total_hours(total_seconds: u64) -> u64 {
        AttendanceLogModule::calculate_total_hours(total_seconds)
    }

    /// Calculate average daily attendance for a user.
    ///
    /// # Arguments
    /// * `env` - Contract environment
    /// * `user_id` - User address to query
    /// * `date_range` - Date range to analyze
    ///
    /// # Returns
    /// * `Ok(u64)` - Average daily attendance count
    /// * `Err(Error)` - If date range is invalid or no records found
    ///
    /// # Errors
    /// * `InvalidDateRange` - Start time is after end time
    /// * `NoAttendanceRecords` - No records found for user in range
    pub fn get_avg_daily_attendance(
        env: Env,
        user_id: Address,
        date_range: DateRange,
    ) -> Result<u64, Error> {
        AttendanceLogModule::calculate_average_daily_attendance(env, user_id, date_range)
    }
}

mod test;
