#![no_std]
#![allow(deprecated)]

mod errors;
mod types;

#[cfg(test)]
mod test;

pub use errors::Error;
pub use types::{Proposal, ProposalStatus, Vote, VoteChoice};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

/// CT-15: DataKey covers all required variants.
// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Proposal(String),
    ProposalList,
    Vote(String, Address),
    MemberVotes(Address),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    // ── Helpers ───────────────────────────────────────────────────────────────

    fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin = Self::get_admin(env)?;
        if caller != &admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    // ── CT-15: initialize stub ────────────────────────────────────────────────
    fn load_proposal(env: &Env, proposal_id: &String) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id.clone()))
            .ok_or(Error::ProposalNotFound)
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.events().publish((symbol_short!("init"),), (admin,));
        Ok(())
    }

    // ── CT-16: create_proposal ────────────────────────────────────────────────
    // ── Proposal creation ─────────────────────────────────────────────────────

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        id: String,
        title: String,
        description: String,
        proposal_id: String,
        title: String,
        start_time: u64,
        end_time: u64,
    ) -> Result<(), Error> {
        proposer.require_auth();

        if start_time >= end_time {
            return Err(Error::InvalidTimeRange);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Proposal(id.clone()))
            .has(&DataKey::Proposal(proposal_id.clone()))
        {
            return Err(Error::ProposalAlreadyExists);
        }

        let proposal = Proposal {
            id: id.clone(),
            title: title.clone(),
            description,
            proposer: proposer.clone(),
            start_time,
            end_time,
            status: ProposalStatus::Active,
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            id: proposal_id.clone(),
            title: title.clone(),
            proposer: proposer.clone(),
            start_time,
            end_time,
            yes_votes: 0,
            no_votes: 0,
            abstain_votes: 0,
            status: ProposalStatus::Active,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(id.clone()), &proposal);
            .set(&DataKey::Proposal(proposal_id.clone()), &proposal);

        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::ProposalList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().instance().set(&DataKey::ProposalList, &list);

        env.events().publish(
            (symbol_short!("created"), id),
        list.push_back(proposal_id.clone());
        env.storage()
            .instance()
            .set(&DataKey::ProposalList, &list);

        env.events().publish(
            (symbol_short!("created"), proposal_id),
            (proposer, title, start_time, end_time),
        );
        Ok(())
    }

    // ── CT-17: cast_vote ──────────────────────────────────────────────────────
    // ── Voting ────────────────────────────────────────────────────────────────

    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: String,
        choice: VoteChoice,
    ) -> Result<(), Error> {
        voter.require_auth();

        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id.clone()))
            .ok_or(Error::ProposalNotFound)?;
        let mut proposal = Self::load_proposal(&env, &proposal_id)?;

        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotActive);
        }

        let now = env.ledger().timestamp();
        if now < proposal.start_time {
            return Err(Error::VotingNotStarted);
        }
        if now >= proposal.end_time {
            return Err(Error::VotingPeriodEnded);
        }

        let vote_key = DataKey::Vote(proposal_id.clone(), voter.clone());
        if env.storage().persistent().has(&vote_key) {
            return Err(Error::AlreadyVoted);
        }

        match choice {
            VoteChoice::Yes => proposal.yes_votes += 1,
            VoteChoice::No => proposal.no_votes += 1,
            VoteChoice::Abstain => proposal.abstain_votes += 1,
        }

        let vote = Vote {
            proposal_id: proposal_id.clone(),
            voter: voter.clone(),
            voter: voter.clone(),
            proposal_id: proposal_id.clone(),
            choice: choice.clone(),
            voted_at: now,
        };

        env.storage().persistent().set(&vote_key, &vote);
        env.storage()
            .persistent()
            .set(&vote_key, &vote);
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id.clone()), &proposal);

        // Index: member → voted proposal IDs
        let mut member_votes: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::MemberVotes(voter.clone()))
            .unwrap_or(Vec::new(&env));
        member_votes.push_back(proposal_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::MemberVotes(voter.clone()), &member_votes);

        env.events()
            .publish((symbol_short!("voted"), proposal_id), (voter, choice));
        Ok(())
    }

    // ── Admin-only finalize / cancel (needed for completeness) ────────────────

    pub fn finalize_proposal(env: Env, caller: Address, proposal_id: String) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id.clone()))
            .ok_or(Error::ProposalNotFound)?;
    // ── CT-18: Finalization ───────────────────────────────────────────────────

    pub fn finalize_proposal(
        env: Env,
        caller: Address,
        proposal_id: String,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let mut proposal = Self::load_proposal(&env, &proposal_id)?;

        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotActive);
        }
        if env.ledger().timestamp() < proposal.end_time {
            return Err(Error::VotingPeriodNotEnded);
        }

        proposal.status = if proposal.yes_votes > proposal.no_votes {
            ProposalStatus::Passed
        } else {
            ProposalStatus::Rejected
        };
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id.clone()), &proposal);

        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id.clone()), &proposal);

        env.events().publish(
            (symbol_short!("final"), proposal_id),
            (proposal.yes_votes, proposal.no_votes, proposal.status),
        );
        Ok(())
    }

    pub fn cancel_proposal(env: Env, caller: Address, proposal_id: String) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id.clone()))
            .ok_or(Error::ProposalNotFound)?;
        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotActive);
        }
    // ── CT-19: Cancellation ───────────────────────────────────────────────────

    pub fn cancel_proposal(
        env: Env,
        caller: Address,
        proposal_id: String,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let mut proposal = Self::load_proposal(&env, &proposal_id)?;

        if proposal.status != ProposalStatus::Active {
            return Err(Error::ProposalNotActive);
        }

        proposal.status = ProposalStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id.clone()), &proposal);

        env.events()
            .publish((symbol_short!("cancel"), proposal_id), (caller,));
        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn get_proposal(env: Env, proposal_id: String) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalNotFound)
    // ── CT-20: Queries ────────────────────────────────────────────────────────

    pub fn get_proposal(env: Env, proposal_id: String) -> Result<Proposal, Error> {
        Self::load_proposal(&env, &proposal_id)
    }

    pub fn get_all_proposals(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::ProposalList)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_vote(env: Env, proposal_id: String, voter: Address) -> Option<Vote> {
        env.storage()
            .persistent()
            .get(&DataKey::Vote(proposal_id, voter))
    }

    pub fn has_voted(env: Env, proposal_id: String, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Vote(proposal_id, voter))
    }

    pub fn get_member_votes(env: Env, voter: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberVotes(voter))
            .unwrap_or(Vec::new(&env))
    pub fn get_member_votes(env: Env, voter: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberVotes(voter))
            .unwrap_or(Vec::new(&env))
    }

    pub fn has_voted(env: Env, proposal_id: String, voter: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Vote(proposal_id, voter))
    }

    pub fn get_proposal_result(env: Env, proposal_id: String) -> Result<ProposalStatus, Error> {
        let proposal = Self::load_proposal(&env, &proposal_id)?;
        Ok(proposal.status)
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        Self::get_admin(&env)
    }
}
