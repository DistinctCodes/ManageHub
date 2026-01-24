use soroban_sdk::{contracttype, Address, String, Vec};

// Re-export types from common_types for consistency
pub use common_types::MembershipStatus;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum AttendanceAction {
    ClockIn,
    ClockOut,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Subscription {
    pub id: String,
    pub user: Address,
    pub payment_token: Address,
    pub amount: i128,
    pub status: MembershipStatus,
    pub created_at: u64,
    pub expires_at: u64,
}

// Attendance analytics summary structures
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AttendanceSummary {
    pub user_id: Address,
    pub date_range_start: u64,
    pub date_range_end: u64,
    pub total_clock_ins: u32,
    pub total_clock_outs: u32,
    pub total_duration: u64,
    pub average_session_duration: u64,
    pub total_sessions: u32,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AttendanceReport {
    pub report_id: String,
    pub generated_at: u64,
    pub date_range_start: u64,
    pub date_range_end: u64,
    pub total_users: u32,
    pub total_attendances: u32,
    pub user_summaries: Vec<AttendanceSummary>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct SessionPair {
    pub clock_in_time: u64,
    pub clock_out_time: u64,
    pub duration: u64,
}
