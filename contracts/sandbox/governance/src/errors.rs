use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AdminNotSet = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    ProposalNotFound = 4,
    ProposalNotActive = 5,
    AlreadyVoted = 6,
    VotingPeriodEnded = 7,
    VotingPeriodNotEnded = 8,
    InvalidTimeRange = 9,
    ProposalAlreadyExists = 10,
    VotingNotStarted = 11,
}
