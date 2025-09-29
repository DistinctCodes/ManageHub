#![cfg(test)]

use super::*;
use crate::errors::Error;
use crate::membership_token::MembershipTokenContract;
use crate::types::MembershipStatus;
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

    let admin = Address::generate(&env);

    // Set admin should succeed
    let result = MembershipTokenContract::set_admin(env.clone(), admin.clone());
    assert!(result.is_ok());
}

#[test]
fn test_issue_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin first
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();

    // Issue token should succeed
    let result = MembershipTokenContract::issue_token(
        env.clone(),
        token_id.clone(),
        user.clone(),
        expiry_date,
    );
    assert!(result.is_ok());

    // Verify token was stored correctly
    let token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
    assert_eq!(token.issue_date, env.ledger().timestamp());
}

#[test]
fn test_issue_token_admin_not_set() {
    let env = Env::default();
    env.mock_all_auths();

    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Try to issue token without setting admin
    let result = MembershipTokenContract::issue_token(env.clone(), token_id, user, expiry_date);
    assert_eq!(result, Err(Error::AdminNotSet));
}

#[test]
fn test_issue_token_already_issued() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
        .unwrap();

    // Try to issue the same token again
    let result = MembershipTokenContract::issue_token(
        env.clone(),
        token_id.clone(),
        user.clone(),
        expiry_date,
    );
    assert_eq!(result, Err(Error::TokenAlreadyIssued));
}

#[test]
fn test_issue_token_invalid_expiry_date_equal() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();

    // Set admin
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();

    // Try to issue token with expiry date equal to current time
    let result = MembershipTokenContract::issue_token(env.clone(), token_id, user, current_time);
    assert_eq!(result, Err(Error::InvalidExpiryDate));
}

#[test]
fn test_issue_token_invalid_expiry_date_past() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let past_time = env.ledger().timestamp() - 100; // Past time

    // Set admin
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();

    // Try to issue token with past expiry date
    let result = MembershipTokenContract::issue_token(env.clone(), token_id, user, past_time);
    assert_eq!(result, Err(Error::InvalidExpiryDate));
}

#[test]
fn test_get_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
        .unwrap();

    // Get token should succeed
    let result = MembershipTokenContract::get_token(env.clone(), token_id.clone());
    assert!(result.is_ok());

    let token = result.unwrap();
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
}

#[test]
fn test_get_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let token_id = BytesN::<32>::random(&env);

    // Try to get non-existent token
    let result = MembershipTokenContract::get_token(env.clone(), token_id);
    assert_eq!(result, Err(Error::TokenNotFound));
}

#[test]
fn test_get_token_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
        .unwrap();

    // Advance time beyond expiry
    env.ledger().with_mut(|l| l.timestamp += 2000);

    // Get token should return expired error
    let result = MembershipTokenContract::get_token(env.clone(), token_id);
    assert_eq!(result, Err(Error::TokenExpired));
}

#[test]
fn test_get_token_inactive_but_not_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
        .unwrap();

    // Manually set token status to inactive (simulate external state change)
    let mut token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
    token.status = MembershipStatus::Inactive;
    env.storage().persistent().set(
        &crate::membership_token::DataKey::Token(token_id.clone()),
        &token,
    );

    // Get token should succeed since it only checks expiry for Active tokens
    let result = MembershipTokenContract::get_token(env.clone(), token_id);
    assert!(result.is_ok());
    let returned_token = result.unwrap();
    assert_eq!(returned_token.status, MembershipStatus::Inactive);
}

#[test]
fn test_transfer_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user1.clone(), expiry_date)
        .unwrap();

    // Transfer token should succeed
    let result =
        MembershipTokenContract::transfer_token(env.clone(), token_id.clone(), user2.clone());
    assert!(result.is_ok());

    // Verify new owner
    let token = MembershipTokenContract::get_token(env.clone(), token_id).unwrap();
    assert_eq!(token.user, user2);
    assert_eq!(token.status, MembershipStatus::Active);
}

#[test]
fn test_transfer_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let _user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Try to transfer non-existent token
    let result = MembershipTokenContract::transfer_token(env.clone(), token_id, user2);
    assert_eq!(result, Err(Error::TokenNotFound));
}

#[test]
fn test_transfer_token_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user1.clone(), expiry_date)
        .unwrap();

    // Manually set token status to inactive
    let mut token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
    token.status = MembershipStatus::Inactive;
    env.storage().persistent().set(
        &crate::membership_token::DataKey::Token(token_id.clone()),
        &token,
    );

    // Transfer should fail for inactive token
    let result = MembershipTokenContract::transfer_token(env.clone(), token_id, user2);
    assert_eq!(result, Err(Error::TokenExpired));
}

#[test]
fn test_multiple_tokens_different_users() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id1 = BytesN::<32>::random(&env);
    let token_id2 = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();

    // Issue tokens to different users
    MembershipTokenContract::issue_token(
        env.clone(),
        token_id1.clone(),
        user1.clone(),
        expiry_date,
    )
    .unwrap();
    MembershipTokenContract::issue_token(
        env.clone(),
        token_id2.clone(),
        user2.clone(),
        expiry_date,
    )
    .unwrap();

    // Both tokens should be retrievable
    let token1 = MembershipTokenContract::get_token(env.clone(), token_id1).unwrap();
    let token2 = MembershipTokenContract::get_token(env.clone(), token_id2).unwrap();

    assert_eq!(token1.user, user1);
    assert_eq!(token2.user, user2);
    assert_eq!(token1.status, MembershipStatus::Active);
    assert_eq!(token2.status, MembershipStatus::Active);
}

#[test]
fn test_admin_change() {
    let env = Env::default();
    env.mock_all_auths();

    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set first admin
    MembershipTokenContract::set_admin(env.clone(), admin1.clone()).unwrap();

    // Issue token with first admin
    MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
        .unwrap();

    // Change admin
    MembershipTokenContract::set_admin(env.clone(), admin2.clone()).unwrap();

    // New admin should be able to issue tokens
    let token_id2 = BytesN::<32>::random(&env);
    let result = MembershipTokenContract::issue_token(
        env.clone(),
        token_id2.clone(),
        user.clone(),
        expiry_date,
    );
    assert!(result.is_ok());
}

#[test]
fn test_edge_case_expiry_date_boundary() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();
    let expiry_date = current_time + 1; // Just 1 second in the future

    // Set admin
    MembershipTokenContract::set_admin(env.clone(), admin.clone()).unwrap();

    // Issue token with minimal future expiry
    let result = MembershipTokenContract::issue_token(
        env.clone(),
        token_id.clone(),
        user.clone(),
        expiry_date,
    );
    assert!(result.is_ok());

    // Token should be retrievable now
    let token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
    assert_eq!(token.status, MembershipStatus::Active);

    // Advance time by exactly the expiry duration
    env.ledger().with_mut(|l| l.timestamp += 1);

    // Now token should be expired
    let result = MembershipTokenContract::get_token(env.clone(), token_id);
    assert_eq!(result, Err(Error::TokenExpired));
}
