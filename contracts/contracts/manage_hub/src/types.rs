use soroban_sdk::{contracttype, String, Address};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MembershipStatus {
    Active,
    Expired,
    Revoked,
    Inactive,
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
