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
    pub paused_at: Option<u64>,
    pub last_resumed_at: u64,
    pub pause_count: u32,
    pub total_paused_duration: u64,
    pub pause_history: Vec<PauseHistoryEntry>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PauseAction {
    Pause,
    Resume,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseHistoryEntry {
    pub action: PauseAction,
    pub timestamp: u64,
    pub actor: Address,
    pub is_admin: bool,
    pub reason: Option<String>,
    pub paused_duration: Option<u64>,
    pub applied_extension: Option<u64>,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseConfig {
    pub max_pause_duration: u64,
    pub max_pause_count: u32,
    pub min_active_time: u64,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct PauseStats {
    pub pause_count: u32,
    pub total_paused_duration: u64,
    pub is_paused: bool,
    pub paused_at: Option<u64>,
}
