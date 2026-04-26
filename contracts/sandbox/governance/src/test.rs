#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Env, String,
};

fn setup() -> (Env, GovernanceContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin).unwrap();
    (env, client, admin)
}

fn make_proposal(
    env: &Env,
    client: &GovernanceContractClient,
    proposer: &Address,
    id: &str,
    start: u64,
    end: u64,
) {
    client
        .create_proposal(
            proposer,
            &String::from_str(env, id),
            &String::from_str(env, "Test Proposal"),
            &start,
            &end,
        )
        .unwrap();
}

// ── CT-21 tests ───────────────────────────────────────────────────────────────

#[test]
fn test_proposal_creation_succeeds() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-1", 200, 400);
    let p = client
        .get_proposal(&String::from_str(&env, "prop-1"))
        .unwrap();
    assert_eq!(p.status, ProposalStatus::Active);
}

#[test]
fn test_proposal_creation_rejects_duplicate() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-dup", 200, 400);
    let err = client
        .try_create_proposal(
            &proposer,
            &String::from_str(&env, "prop-dup"),
            &String::from_str(&env, "Dup"),
            &200,
            &400,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::ProposalAlreadyExists);
}

#[test]
fn test_cast_vote_records_vote() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-v", 50, 400);
    client
        .cast_vote(&voter, &String::from_str(&env, "prop-v"), &VoteChoice::Yes)
        .unwrap();
    assert!(client.has_voted(&String::from_str(&env, "prop-v"), &voter));
    let vote = client
        .get_vote(&String::from_str(&env, "prop-v"), &voter)
        .unwrap();
    assert_eq!(vote.choice, VoteChoice::Yes);
}

#[test]
fn test_cast_vote_rejects_double_voting() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-dv", 50, 400);
    client
        .cast_vote(&voter, &String::from_str(&env, "prop-dv"), &VoteChoice::Yes)
        .unwrap();
    let err = client
        .try_cast_vote(&voter, &String::from_str(&env, "prop-dv"), &VoteChoice::No)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::AlreadyVoted);
}

#[test]
fn test_cast_vote_fails_outside_voting_period() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    // Before start
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-t1", 200, 400);
    let err = client
        .try_cast_vote(&voter, &String::from_str(&env, "prop-t1"), &VoteChoice::Yes)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::VotingNotStarted);

    // After end
    env.ledger().set_timestamp(500);
    let err2 = client
        .try_cast_vote(&voter, &String::from_str(&env, "prop-t1"), &VoteChoice::Yes)
        .unwrap_err()
        .unwrap();
    assert_eq!(err2, Error::VotingPeriodEnded);
}

#[test]
fn test_finalize_proposal_passed() {
    let (env, client, admin) = setup();
    let proposer = Address::generate(&env);
    let voter1 = Address::generate(&env);
    let voter2 = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-f", 50, 200);
    client
        .cast_vote(&voter1, &String::from_str(&env, "prop-f"), &VoteChoice::Yes)
        .unwrap();
    client
        .cast_vote(&voter2, &String::from_str(&env, "prop-f"), &VoteChoice::Yes)
        .unwrap();
    env.ledger().set_timestamp(300);
    client
        .finalize_proposal(&admin, &String::from_str(&env, "prop-f"))
        .unwrap();
    let p = client
        .get_proposal(&String::from_str(&env, "prop-f"))
        .unwrap();
    assert_eq!(p.status, ProposalStatus::Passed);
}

#[test]
fn test_finalize_proposal_rejected() {
    let (env, client, admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-r", 50, 200);
    client
        .cast_vote(&voter, &String::from_str(&env, "prop-r"), &VoteChoice::No)
        .unwrap();
    env.ledger().set_timestamp(300);
    client
        .finalize_proposal(&admin, &String::from_str(&env, "prop-r"))
        .unwrap();
    let p = client
        .get_proposal(&String::from_str(&env, "prop-r"))
        .unwrap();
    assert_eq!(p.status, ProposalStatus::Rejected);
}

#[test]
fn test_finalize_fails_before_voting_ends() {
    let (env, client, admin) = setup();
    let proposer = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-fe", 50, 500);
    let err = client
        .try_finalize_proposal(&admin, &String::from_str(&env, "prop-fe"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::VotingPeriodNotEnded);
}

#[test]
fn test_cancel_proposal_blocks_further_voting() {
    let (env, client, admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-c", 50, 500);
    client
        .cancel_proposal(&admin, &String::from_str(&env, "prop-c"))
        .unwrap();
    let p = client
        .get_proposal(&String::from_str(&env, "prop-c"))
        .unwrap();
    assert_eq!(p.status, ProposalStatus::Cancelled);
    let err = client
        .try_cast_vote(&voter, &String::from_str(&env, "prop-c"), &VoteChoice::Yes)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::ProposalNotActive);
}

#[test]
fn test_non_admin_cannot_finalize() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let non_admin = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-na", 50, 200);
    env.ledger().set_timestamp(300);
    let err = client
        .try_finalize_proposal(&non_admin, &String::from_str(&env, "prop-na"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_non_admin_cannot_cancel() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let non_admin = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "prop-nc", 50, 500);
    let err = client
        .try_cancel_proposal(&non_admin, &String::from_str(&env, "prop-nc"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_get_all_proposals_and_member_votes() {
    let (env, client, _admin) = setup();
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);
    env.ledger().set_timestamp(100);
    make_proposal(&env, &client, &proposer, "p1", 50, 500);
    make_proposal(&env, &client, &proposer, "p2", 50, 500);
    let all = client.get_all_proposals();
    assert_eq!(all.len(), 2);
    client
        .cast_vote(&voter, &String::from_str(&env, "p1"), &VoteChoice::Yes)
        .unwrap();
    let mv = client.get_member_votes(&voter);
    assert_eq!(mv.len(), 1);
}
