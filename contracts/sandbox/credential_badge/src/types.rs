use soroban_sdk::{contracttype, Address, String};

/// A category of badge that can be issued to members.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BadgeType {
    pub id: String,
    pub name: String,
    pub issuer: Address,
}

/// A credential issued to a holder for a specific badge type.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Credential {
    pub badge_type_id: String,
    pub holder: Address,
    pub issued_at: u64,
    pub revoked: bool,
}
