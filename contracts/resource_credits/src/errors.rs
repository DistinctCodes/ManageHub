use soroban_sdk::contracterror;

/// Resource credits contract errors.
///
/// Error code range: 6000–6999
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set yet.
    AdminNotSet = 6000,
    /// Contract already initialized.
    AlreadyInitialized = 6001,
    /// Caller is not the admin.
    Unauthorized = 6002,
    /// Member balance is too low.
    InsufficientBalance = 6003,
    /// Amount must be greater than zero.
    InvalidAmount = 6004,
    /// Account not found in storage.
    AccountNotFound = 6005,
    /// Contract is paused.
    ContractPaused = 6006,
}
