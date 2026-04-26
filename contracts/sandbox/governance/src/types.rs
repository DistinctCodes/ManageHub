use soroban_sdk::{contracttype, Address, String};

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
    pub choice: VoteChoice,
    pub voted_at: u64,
}
