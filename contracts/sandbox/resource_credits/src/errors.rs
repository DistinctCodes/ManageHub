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
    /// Member has insufficient credits for the operation.
    InsufficientBalance = 4,
    /// Credits have passed their expiry timestamp.
    CreditsExpired = 5,
}
