// contracts/payment_escrow/src/types.rs
use soroban_sdk::{contracttype, Address, String};

/// Lifecycle state of an escrow.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowStatus {
    /// Funds are locked and awaiting a release decision.
    Pending,
    /// Funds have been sent to the beneficiary.
    Released,
    /// Funds have been returned to the depositor.
    Refunded,
    /// Depositor raised a dispute — admin must resolve before funds move.
    Disputed,
}

/// A locked-fund record held in escrow between a depositor and a beneficiary.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Escrow {
    /// Unique escrow identifier provided by the caller.
    pub id: String,
    /// Address that locked the funds (e.g. a hub member paying a deposit).
    pub depositor: Address,
    /// Address that receives the funds upon release (e.g. the hub operator).
    pub beneficiary: Address,
    /// Locked amount in the smallest unit of `payment_token`.
    pub amount: i128,
    /// Token address snapshotted at creation time so future admin changes
    /// do not affect in-flight escrows.
    pub payment_token: Address,
    /// Current lifecycle status.
    pub status: EscrowStatus,
    /// Human-readable purpose (e.g. "Security deposit – booking ws-001").
    pub description: String,
    /// Ledger timestamp when the escrow was created.
    pub created_at: u64,
    /// If non-zero, the beneficiary may self-claim after this Unix timestamp
    /// without waiting for admin approval.  Zero disables auto-claim.
    pub release_after: u64,
    /// Seconds after `created_at` during which the depositor may raise a
    /// dispute.  Zero means disputes are disabled for this escrow.
    pub dispute_window: u64,
    /// Ledger timestamp when a dispute was raised, if any.
    pub dispute_raised_at: Option<u64>,
    /// Ledger timestamp when the escrow was resolved (released/refunded).
    pub resolved_at: Option<u64>,
}
