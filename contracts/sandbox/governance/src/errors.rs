use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
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
