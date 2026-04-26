use soroban_sdk::{contracttype, Address};

/// Credit balance record for a member.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditBalance {
    /// Amount of credits held.
    pub amount: u128,
    /// Optional ledger timestamp after which credits are expired.
    pub expires_at: Option<u64>,
}

/// Event emitted when credits are minted.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditsMinted {
    pub member: Address,
    pub amount: u128,
    pub expires_at: Option<u64>,
}

/// Event emitted when credits are transferred.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditsTransferred {
    pub from: Address,
    pub to: Address,
    pub amount: u128,
}

/// Event emitted when credits are spent.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditsSpent {
    pub member: Address,
    pub amount: u128,
}
