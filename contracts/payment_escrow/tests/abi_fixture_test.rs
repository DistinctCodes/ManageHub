//! Shared ABI fixture verification test for payment_escrow contract (#2025).
//! Ensures contract errors, versions, and states remain synchronized with
//! the committed fixture at `contracts/shared/payment_escrow.abi.json`.

use payment_escrow::{Error, EscrowState, VERSION};

#[test]
fn contract_version_matches_abi_fixture() {
    assert_eq!(VERSION, 1, "Contract VERSION must match fixture version");
}

#[test]
fn contract_error_codes_match_abi_fixture() {
    assert_eq!(Error::NotFound as u32, 1);
    assert_eq!(Error::AlreadyResolved as u32, 2);
    assert_eq!(Error::InvalidAmount as u32, 3);
    assert_eq!(Error::AlreadyExists as u32, 4);
    assert_eq!(Error::ArithmeticOverflow as u32, 5);
    assert_eq!(Error::AlreadyReleased as u32, 6);
    assert_eq!(Error::AlreadyRefunded as u32, 7);
    assert_eq!(Error::AlreadyInitialized as u32, 10);
    assert_eq!(Error::NotInitialized as u32, 11);
    assert_eq!(Error::Unauthorized as u32, 12);
    assert_eq!(Error::Paused as u32, 13);
    assert_eq!(Error::NoPendingAdmin as u32, 14);
    assert_eq!(Error::AmountExceedsEscrow as u32, 20);
    assert_eq!(Error::NothingToRefund as u32, 21);
}

#[test]
fn escrow_states_match_abi_fixture() {
    assert_eq!(EscrowState::Locked as u32, 1);
    assert_eq!(EscrowState::Released as u32, 2);
    assert_eq!(EscrowState::Refunded as u32, 3);
    assert_eq!(EscrowState::Completed as u32, 4);
}
