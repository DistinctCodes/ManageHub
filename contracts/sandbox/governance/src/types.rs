use soroban_sdk::{contracttype, Address, String};

/// Vote choice cast by a member.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
    Abstain,
}

/// Lifecycle status of a proposal.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    /// Voting is open.
    Active,
    /// Voting ended; yes_votes > no_votes.
    Passed,
    /// Voting ended; yes_votes <= no_votes.
    Rejected,
    /// Cancelled by admin before finalization.
    Cancelled,
}

/// A governance proposal.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Proposal {
    pub id: String,
    pub title: String,
    pub proposer: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub abstain_votes: u32,
    pub status: ProposalStatus,
    pub created_at: u64,
}

/// A single vote record.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Vote {
    pub voter: Address,
    pub proposal_id: String,
    pub choice: VoteChoice,
    pub voted_at: u64,
}
