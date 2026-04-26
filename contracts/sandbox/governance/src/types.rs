use soroban_sdk::{contracttype, Address, String};

/// Vote choice cast by a member.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VoteChoice {
    Yes,
    No,
    Abstain,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Cancelled,
}

/// CT-15: Proposal type with all required fields.
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
    pub description: String,
    pub proposer: Address,
    pub start_time: u64,
    pub end_time: u64,
    pub status: ProposalStatus,
    pub yes_votes: u32,
    pub no_votes: u32,
    pub abstain_votes: u32,
    pub created_at: u64,
}

/// CT-15: Vote type with all required fields.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Vote {
    pub proposal_id: String,
    pub voter: Address,
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
