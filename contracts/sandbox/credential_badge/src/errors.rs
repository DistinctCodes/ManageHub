use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AdminNotSet = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    BadgeTypeNotFound = 4,
    CredentialNotFound = 5,
    AlreadyIssued = 6,
    CredentialRevoked = 7,
    BadgeTypeAlreadyExists = 8,
}
