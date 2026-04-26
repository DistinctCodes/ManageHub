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
    /// Contract already initialized.
    AlreadyInitialized = 1,
    /// No admin set.
    AdminNotSet = 2,
    /// Caller is not the admin.
    Unauthorized = 3,
    /// Proposal ID already exists.
    ProposalAlreadyExists = 4,
    /// Proposal not found.
    ProposalNotFound = 5,
    /// Proposal is not in Active status.
    ProposalNotActive = 6,
    /// Voting period has not started yet.
    VotingNotStarted = 7,
    /// Voting period has already ended.
    VotingPeriodEnded = 8,
    /// Voting period has not ended yet.
    VotingPeriodNotEnded = 9,
    /// Member has already voted on this proposal.
    AlreadyVoted = 10,
    /// Invalid time range (start >= end).
    InvalidTimeRange = 11,
}
