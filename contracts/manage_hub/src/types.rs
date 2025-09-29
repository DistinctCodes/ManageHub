use soroban_sdk::contracttype;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MembershipStatus {
    Active,
    Expired,
    Revoked,
    Inactive,
}
