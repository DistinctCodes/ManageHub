use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AdminNotSet = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    BadgeTypeNotFound = 4,
    BadgeTypeAlreadyExists = 5,
    CredentialNotFound = 6,
    CredentialAlreadyIssued = 7,
    CredentialRevoked = 8,
}
