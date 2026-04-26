#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, Address, ResourceCreditsContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ResourceCreditsContract, ());
    let client = ResourceCreditsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin).unwrap();
    (env, admin, client)
}

// ── initialize ────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_sets_admin() {
    let (env, admin, client) = setup();
    assert_eq!(client.get_admin().unwrap(), admin);
    assert_eq!(client.get_total_supply(), 0u128);
}

#[test]
fn test_initialize_rejects_reinit() {
    let (_, _, client) = setup();
    let other = Address::generate(&client.env);
    assert_eq!(
        client.try_initialize(&other).unwrap_err().unwrap(),
        Error::AlreadyInitialized
    );
}

// ── mint_credits ──────────────────────────────────────────────────────────────

#[test]
fn test_mint_increases_balance_and_supply() {
    let (_, admin, client) = setup();
    let member = Address::generate(&client.env);
    client.mint_credits(&admin, &member, &100u128, &None).unwrap();
    assert_eq!(client.get_balance(&member), 100u128);
    assert_eq!(client.get_total_supply(), 100u128);
}

#[test]
fn test_mint_rejects_non_admin() {
    let (_, _, client) = setup();
    let non_admin = Address::generate(&client.env);
    let member = Address::generate(&client.env);
    assert_eq!(
        client
            .try_mint_credits(&non_admin, &member, &50u128, &None)
            .unwrap_err()
            .unwrap(),
        Error::Unauthorized
    );
}

// ── transfer_credits ──────────────────────────────────────────────────────────

#[test]
fn test_transfer_moves_credits() {
    let (_, admin, client) = setup();
    let alice = Address::generate(&client.env);
    let bob = Address::generate(&client.env);
    client.mint_credits(&admin, &alice, &100u128, &None).unwrap();
    client.transfer_credits(&alice, &bob, &40u128).unwrap();
    assert_eq!(client.get_balance(&alice), 60u128);
    assert_eq!(client.get_balance(&bob), 40u128);
    // total supply unchanged
    assert_eq!(client.get_total_supply(), 100u128);
}

#[test]
fn test_transfer_fails_insufficient_balance() {
    let (_, admin, client) = setup();
    let alice = Address::generate(&client.env);
    let bob = Address::generate(&client.env);
    client.mint_credits(&admin, &alice, &10u128, &None).unwrap();
    assert_eq!(
        client
            .try_transfer_credits(&alice, &bob, &50u128)
            .unwrap_err()
            .unwrap(),
        Error::InsufficientBalance
    );
}

// ── spend_credits ─────────────────────────────────────────────────────────────

#[test]
fn test_spend_reduces_balance_and_supply() {
    let (_, admin, client) = setup();
    let member = Address::generate(&client.env);
    client.mint_credits(&admin, &member, &80u128, &None).unwrap();
    client.spend_credits(&member, &30u128).unwrap();
    assert_eq!(client.get_balance(&member), 50u128);
    assert_eq!(client.get_total_supply(), 50u128);
}

#[test]
fn test_spend_fails_insufficient_balance() {
    let (_, admin, client) = setup();
    let member = Address::generate(&client.env);
    client.mint_credits(&admin, &member, &5u128, &None).unwrap();
    assert_eq!(
        client
            .try_spend_credits(&member, &10u128)
            .unwrap_err()
            .unwrap(),
        Error::InsufficientBalance
    );
}

// ── expiry (CT-06) ────────────────────────────────────────────────────────────

#[test]
fn test_is_expired_false_before_expiry() {
    let (env, admin, client) = setup();
    let member = Address::generate(&env);
    // expires far in the future
    client
        .mint_credits(&admin, &member, &50u128, &Some(env.ledger().timestamp() + 1000))
        .unwrap();
    assert!(!client.is_expired(&member));
}

#[test]
fn test_is_expired_true_after_expiry() {
    let (env, admin, client) = setup();
    let member = Address::generate(&env);
    // expires in the past (timestamp 1)
    client
        .mint_credits(&admin, &member, &50u128, &Some(1u64))
        .unwrap();
    // advance ledger past expiry
    env.ledger().set_timestamp(1000);
    assert!(client.is_expired(&member));
}

#[test]
fn test_transfer_fails_when_expired() {
    let (env, admin, client) = setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client
        .mint_credits(&admin, &alice, &50u128, &Some(1u64))
        .unwrap();
    env.ledger().set_timestamp(1000);
    assert_eq!(
        client
            .try_transfer_credits(&alice, &bob, &10u128)
            .unwrap_err()
            .unwrap(),
        Error::CreditsExpired
    );
}

#[test]
fn test_spend_fails_when_expired() {
    let (env, admin, client) = setup();
    let member = Address::generate(&env);
    client
        .mint_credits(&admin, &member, &50u128, &Some(1u64))
        .unwrap();
    env.ledger().set_timestamp(1000);
    assert_eq!(
        client
            .try_spend_credits(&member, &10u128)
            .unwrap_err()
            .unwrap(),
        Error::CreditsExpired
    );
}

// ── CT-05: query functions ────────────────────────────────────────────────────

#[test]
fn test_get_balance_returns_zero_for_unknown_member() {
    let (env, _, client) = setup();
    let stranger = Address::generate(&env);
    assert_eq!(client.get_balance(&stranger), 0u128);
}

#[test]
fn test_get_admin_returns_admin() {
    let (_, admin, client) = setup();
    assert_eq!(client.get_admin().unwrap(), admin);
}

#[test]
fn test_get_total_supply_accumulates() {
    let (_, admin, client) = setup();
    let a = Address::generate(&client.env);
    let b = Address::generate(&client.env);
    client.mint_credits(&admin, &a, &200u128, &None).unwrap();
    client.mint_credits(&admin, &b, &300u128, &None).unwrap();
    assert_eq!(client.get_total_supply(), 500u128);
}
