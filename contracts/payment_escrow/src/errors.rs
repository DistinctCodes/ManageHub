// contracts/payment_escrow/src/errors.rs
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set on the contract.
    AdminNotSet = 1,
    /// Caller is not authorised to perform this action.
    Unauthorized = 2,
    /// Contract has already been initialised.
    AlreadyInitialized = 3,
    /// Escrow ID does not exist.
    EscrowNotFound = 4,
    /// An escrow with this ID already exists.
    EscrowAlreadyExists = 5,
    /// Action requires the escrow to have Pending status.
    EscrowNotPending = 6,
    /// resolve_dispute requires the escrow to have Disputed status.
    EscrowNotDisputed = 7,
    /// Dispute window has closed — too late to raise a dispute.
    DisputeWindowClosed = 8,
    /// release_after timestamp has not been reached yet.
    ClaimTooEarly = 9,
    /// Auto-claim is disabled for this escrow (release_after == 0).
    AutoClaimDisabled = 10,
    /// Escrow amount must be greater than zero.
    InvalidAmount = 11,
    /// Payment token address has not been set.
    PaymentTokenNotSet = 12,
}
