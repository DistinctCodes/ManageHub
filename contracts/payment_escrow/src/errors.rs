// contracts/payment_escrow/src/errors.rs
use soroban_sdk::contracterror;

/// Payment escrow contract errors.
///
/// Error code range: 5000–5999
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set on the contract.
    AdminNotSet = 5000,
    /// Caller is not authorised to perform this action.
    Unauthorized = 5001,
    /// Contract has already been initialised.
    AlreadyInitialized = 5002,
    /// Escrow ID does not exist.
    EscrowNotFound = 5003,
    /// An escrow with this ID already exists.
    EscrowAlreadyExists = 5004,
    /// Action requires the escrow to have Pending status.
    EscrowNotPending = 5005,
    /// resolve_dispute requires the escrow to have Disputed status.
    EscrowNotDisputed = 5006,
    /// Dispute window has closed — too late to raise a dispute.
    DisputeWindowClosed = 5007,
    /// release_after timestamp has not been reached yet.
    ClaimTooEarly = 5008,
    /// Auto-claim is disabled for this escrow (release_after == 0).
    AutoClaimDisabled = 5009,
    /// Escrow amount must be greater than zero.
    InvalidAmount = 5010,
    /// Payment token address has not been set.
    PaymentTokenNotSet = 5011,
    /// Contract is paused.
    ContractPaused = 5012,
}
