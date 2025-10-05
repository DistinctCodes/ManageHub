use soroban_sdk::{contracttype, Address, String};

// Re-export MembershipStatus from common_types for consistency
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
    pub hub_id: String,
    pub payment_token: Address,
    pub amount: i128,
    pub status: MembershipStatus,
    pub created_at: u64,
    pub expires_at: u64,
}
