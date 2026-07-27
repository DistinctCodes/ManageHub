use soroban_sdk::{contracttype, Address};

// Re-use CreditStatus from common_types to avoid duplication across contracts.
pub use common_types::CreditStatus;

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

/// A credit record with optional expiry metadata.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Credit {
    pub owner: Address,
    pub amount: u128,
    /// Timestamp (ledger close time) after which this credit is considered expired.
    /// `None` means the credit does not expire.
    pub expires_at: Option<u64>,
}

/// Summary returned by reconciliation.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct ReconciliationReport {
    pub total_balance: u128,
    pub total_supply: u128,
    pub mismatch: bool,
}
