use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AdminNotSet = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidShares = 4,
    NoBeneficiaries = 5,
    AlreadyClaimed = 6,
    DistributionNotFound = 7,
    NothingToDistribute = 8,
}
