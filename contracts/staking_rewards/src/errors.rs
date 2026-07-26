use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum StakingError {
    Unauthorized = 1,
    StakingDisabled = 2,
    StakeNotFound = 3,
    StillLocked = 4,
    TierNotFound = 5,
    TierAlreadyExists = 6,
    BelowMinimumStake = 7,
    StakingNotConfigured = 8,
    Overflow = 9,
    InvalidConfig = 10,
}
