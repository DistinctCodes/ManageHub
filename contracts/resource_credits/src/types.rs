use soroban_sdk::{contracttype, Address};

/// Type of credit transaction.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TransactionType {
    Mint,
    Transfer,
    Spend,
}

/// A single credit transaction record.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditTransaction {
    pub tx_type: TransactionType,
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub amount: u128,
    pub timestamp: u64,
}

/// Snapshot of a member's credit balance.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct CreditBalance {
    pub owner: Address,
    pub amount: u128,
}
