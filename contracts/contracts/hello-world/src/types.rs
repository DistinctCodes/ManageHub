use soroban_sdk::{contracttype, String};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MembershipStatus {
    Active,
    Expired,
    Revoked,
    Inactive,
}
