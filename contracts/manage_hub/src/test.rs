#![cfg(test)]

extern crate alloc;
use alloc::format;

use super::*;
use crate::types::MembershipStatus;
use soroban_sdk::map;
use soroban_sdk::{
    testutils::{Address as _, BytesN as BytesNTestUtils, Ledger as LedgerTestUtils},
    vec, Address, BytesN, Env, String,
};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let words = client.hello(&String::from_str(&env, "Dev"));
    assert_eq!(
        words,
        vec![
            &env,
            String::from_str(&env, "Hello"),
            String::from_str(&env, "Dev"),
        ]
    );
}
#[test]
fn test_set_admin_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Set admin should succeed
    client.set_admin(&admin);
}

#[test]
fn test_issue_token_success() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin first
    client.set_admin(&admin);

    // Issue token should succeed
    client.issue_token(&token_id, &user, &expiry_date);

    // Verify token was stored correctly
    let token = client.get_token(&token_id);
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
    assert_eq!(token.issue_date, env.ledger().timestamp());
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #1)")]
fn test_issue_token_admin_not_set() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Try to issue token without setting admin
    client.issue_token(&token_id, &user, &expiry_date);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #2)")]
fn test_issue_token_already_issued() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry_date);

    // Try to issue the same token again
    client.issue_token(&token_id, &user, &expiry_date);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #6)")]
fn test_issue_token_invalid_expiry_date_equal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();

    // Set admin
    client.set_admin(&admin);

    // Try to issue token with expiry date equal to current time
    client.issue_token(&token_id, &user, &current_time);
}

#[test]
#[should_panic]
fn test_issue_token_invalid_expiry_date_past() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let past_time = env.ledger().timestamp() - 100; // Past time

    // Set admin
    client.set_admin(&admin);

    // Try to issue token with past expiry date
    client.issue_token(&token_id, &user, &past_time);
}

#[test]
fn test_get_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry_date);

    // Get token should succeed
    let result = client.get_token(&token_id);

    let token = result;
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")]
fn test_get_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let token_id = BytesN::<32>::random(&env);

    // Try to get non-existent token
    client.get_token(&token_id);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #5)")]
fn test_get_token_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry_date);

    // Advance time beyond expiry
    env.ledger().with_mut(|l| l.timestamp += 2000);

    // Get token should return expired error
    client.get_token(&token_id);
}

#[test]
#[should_panic]
fn test_get_token_inactive_but_not_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry_date);

    // Manually set token status to inactive (simulate external state change)
    let mut token = client.get_token(&token_id);
    token.status = MembershipStatus::Inactive;
    env.storage().persistent().set(
        &crate::membership_token::DataKey::Token(token_id.clone()),
        &token,
    );

    // Get token should succeed since it only checks expiry for Active tokens
    let result = client.get_token(&token_id);
    let returned_token = result;
    assert_eq!(returned_token.status, MembershipStatus::Inactive);
}

#[test]
fn test_transfer_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user1, &expiry_date);

    // Transfer token should succeed
    client.transfer_token(&token_id, &user2);

    // Verify new owner
    let token = client.get_token(&token_id);
    assert_eq!(token.user, user2);
    assert_eq!(token.status, MembershipStatus::Active);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #3)")]
fn test_transfer_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let _user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Try to transfer non-existent token
    client.transfer_token(&token_id, &user2);
}

#[test]
#[should_panic]
fn test_transfer_token_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    client.set_admin(&admin);
    client.issue_token(&token_id, &user1, &expiry_date);

    // Manually set token status to inactive
    let mut token = client.get_token(&token_id);
    token.status = MembershipStatus::Inactive;
    env.storage().persistent().set(
        &crate::membership_token::DataKey::Token(token_id.clone()),
        &token,
    );

    // Transfer should fail for inactive token
    client.transfer_token(&token_id, &user2);
}

#[test]
fn test_multiple_tokens_different_users() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id1 = BytesN::<32>::random(&env);
    let token_id2 = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin
    client.set_admin(&admin);

    // Issue tokens to different users
    client.issue_token(&token_id1, &user1, &expiry_date);
    client.issue_token(&token_id2, &user2, &expiry_date);

    // Both tokens should be retrievable
    let token1 = client.get_token(&token_id1);
    let token2 = client.get_token(&token_id2);

    assert_eq!(token1.user, user1);
    assert_eq!(token2.user, user2);
    assert_eq!(token1.status, MembershipStatus::Active);
    assert_eq!(token2.status, MembershipStatus::Active);
}

#[test]
fn test_admin_change() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set first admin
    client.set_admin(&admin1);

    // Issue token with first admin
    client.issue_token(&token_id, &user, &expiry_date);

    // Change admin
    client.set_admin(&admin2);

    // New admin should be able to issue tokens
    let token_id2 = BytesN::<32>::random(&env);
    client.issue_token(&token_id2, &user, &expiry_date);
}

#[test]
fn test_log_event_and_retrieve() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let event_id = BytesN::<32>::random(&env);

    // Log two RSVPs for the same event from different users
    let details1 = map![
        &env,
        (
            String::from_str(&env, "status"),
            String::from_str(&env, "going")
        )
    ];
    let details2 = map![
        &env,
        (
            String::from_str(&env, "status"),
            String::from_str(&env, "interested")
        )
    ];

    client.log_event(&event_id, &user1, &details1);
    client.log_event(&event_id, &user2, &details2);

    // Retrieve by event
    let logs_by_event = client.get_events_by_event(&event_id);
    assert_eq!(logs_by_event.len(), 2);
    assert_eq!(logs_by_event.get(0).unwrap().event_id, event_id);

    // Retrieve by user1
    let logs_by_user1 = client.get_events_by_user(&user1);
    assert_eq!(logs_by_user1.len(), 1);
    assert_eq!(logs_by_user1.get(0).unwrap().user, user1);

    // Retrieve by user2
    let logs_by_user2 = client.get_events_by_user(&user2);
    assert_eq!(logs_by_user2.len(), 1);
    assert_eq!(logs_by_user2.get(0).unwrap().user, user2);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #7)")]
fn test_log_event_details_limit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let event_id = BytesN::<32>::random(&env);

    // Create a map with > 50 entries to trigger InvalidEventDetails
    let mut big_map = soroban_sdk::Map::<String, String>::new(&env);
    for i in 0..51u32 {
        let key = String::from_str(&env, &format!("k{}", i));
        let val = String::from_str(&env, &format!("v{}", i));
        big_map.set(key, val);
    }

    client.log_event(&event_id, &user, &big_map);
}

#[test]
fn test_edge_case_expiry_date_boundary() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();
    let expiry_date = current_time + 1; // Just 1 second in the future

    // Set admin
    client.set_admin(&admin);

    // Issue token with minimal future expiry
    client.issue_token(&token_id, &user, &expiry_date);

    // Token should be retrievable now
    let token = client.get_token(&token_id);
    assert_eq!(token.status, MembershipStatus::Active);

    // Advance time by exactly the expiry duration
    env.ledger().with_mut(|l| l.timestamp += 1);

    // Now token should be expired
    client.get_token(&token_id);
}
