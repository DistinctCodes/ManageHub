use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set yet.
    AdminNotSet = 1,
    /// Contract already initialized.
    AlreadyInitialized = 2,
    /// Caller is not the admin.
    Unauthorized = 3,
    /// Member balance is too low.
    InsufficientBalance = 4,
    /// Amount must be greater than zero.
    InvalidAmount = 5,
    /// Account not found in storage.
    AccountNotFound = 6,
}
