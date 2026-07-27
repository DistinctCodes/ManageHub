#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn setup(env: &Env) -> (Address, ResourceCreditsContractClient) {
    let contract_id = env.register(ResourceCreditsContract, ());
    let client = ResourceCreditsContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    let token = Address::generate(env);
    client.initialize(&admin, &token);
    (admin, client)
}

// ── Initialization ────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let env = Env::default();
    let contract_id = env.register(ResourceCreditsContract, ());
    let client = ResourceCreditsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin, &token);

    assert_eq!(client.total_supply(), 0u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let contract_id = env.register(ResourceCreditsContract, ());
    let client = ResourceCreditsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    client.initialize(&admin, &token);
    // AlreadyInitialized = 2
    client.initialize(&admin, &token);
}

// ── Mint ──────────────────────────────────────────────────────────────────────

#[test]
fn test_mint_credits() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let recipient = Address::generate(&env);

    client.mint_credits(&admin, &recipient, &1_000u128);

    assert_eq!(client.balance(&recipient), 1_000u128);
    assert_eq!(client.total_supply(), 1_000u128);
}

#[test]
fn test_mint_credits_accumulates() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let recipient = Address::generate(&env);

    client.mint_credits(&admin, &recipient, &500u128);
    client.mint_credits(&admin, &recipient, &300u128);

    assert_eq!(client.balance(&recipient), 800u128);
    assert_eq!(client.total_supply(), 800u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_mint_zero_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let recipient = Address::generate(&env);

    // InvalidAmount = 5
    client.mint_credits(&admin, &recipient, &0u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_mint_non_admin_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, client) = setup(&env);
    let non_admin = Address::generate(&env);
    let recipient = Address::generate(&env);

    // Unauthorized = 3
    client.mint_credits(&non_admin, &recipient, &1_000u128);
}

// ── Transfer ──────────────────────────────────────────────────────────────────

#[test]
fn test_transfer_credits() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint_credits(&admin, &alice, &1_000u128);
    client.transfer_credits(&alice, &bob, &400u128);

    assert_eq!(client.balance(&alice), 600u128);
    assert_eq!(client.balance(&bob), 400u128);
    assert_eq!(client.total_supply(), 1_000u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_transfer_zero_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint_credits(&admin, &alice, &1_000u128);
    // InvalidAmount = 5
    client.transfer_credits(&alice, &bob, &0u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_transfer_insufficient_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint_credits(&admin, &alice, &100u128);
    // InsufficientBalance = 4
    client.transfer_credits(&alice, &bob, &200u128);
}

// ── Spend ─────────────────────────────────────────────────────────────────────

#[test]
fn test_spend_credits() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let member = Address::generate(&env);

    client.mint_credits(&admin, &member, &1_000u128);
    client.spend_credits(&member, &350u128);

    assert_eq!(client.balance(&member), 650u128);
    assert_eq!(client.total_supply(), 650u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_spend_zero_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let member = Address::generate(&env);

    client.mint_credits(&admin, &member, &1_000u128);
    // InvalidAmount = 5
    client.spend_credits(&member, &0u128);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_spend_insufficient_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let member = Address::generate(&env);

    client.mint_credits(&admin, &member, &100u128);
    // InsufficientBalance = 4
    client.spend_credits(&member, &200u128);
}

// ── Balance / Supply ──────────────────────────────────────────────────────────

#[test]
fn test_balance_defaults_to_zero() {
    let env = Env::default();
    let (admin, client) = setup(&env);
    let user = Address::generate(&env);
    let _ = admin;

    assert_eq!(client.balance(&user), 0u128);
}

#[test]
fn test_total_supply_starts_at_zero() {
    let env = Env::default();
    let (_admin, client) = setup(&env);

    assert_eq!(client.total_supply(), 0u128);
}

// ── Multiple operations sequence ──────────────────────────────────────────────

#[test]
fn test_multiple_operations() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Mint
    client.mint_credits(&admin, &alice, &5_000u128);
    assert_eq!(client.balance(&alice), 5_000u128);

    // Transfer
    client.transfer_credits(&alice, &bob, &1_500u128);
    assert_eq!(client.balance(&alice), 3_500u128);
    assert_eq!(client.balance(&bob), 1_500u128);

    // Spend
    client.spend_credits(&alice, &1_000u128);
    assert_eq!(client.balance(&alice), 2_500u128);

    // Verify total supply: 5000 - 1000 = 4000
    assert_eq!(client.total_supply(), 4_000u128);

    // Mint more
    client.mint_credits(&admin, &bob, &2_000u128);
    assert_eq!(client.balance(&bob), 3_500u128);
    assert_eq!(client.total_supply(), 6_000u128);
}

// ── Admin auth ────────────────────────────────────────────────────────────────

#[test]
fn test_admin_mint_requires_auth() {
    let env = Env::default();
    let (admin, client) = setup(&env);
    let recipient = Address::generate(&env);

    // No mock_all_auths — require_auth will fail
    let result = client.try_mint_credits(&admin, &recipient, &1_000u128);
    assert!(result.is_err());
}

#[test]
fn test_admin_mint_with_mock_auth() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let recipient = Address::generate(&env);

    client.mint_credits(&admin, &recipient, &2_500u128);
    assert_eq!(client.balance(&recipient), 2_500u128);
}

// ── Edge: spend all ───────────────────────────────────────────────────────────

#[test]
fn test_spend_all_credits() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let member = Address::generate(&env);

    client.mint_credits(&admin, &member, &100u128);
    client.spend_credits(&member, &100u128);

    assert_eq!(client.balance(&member), 0u128);
    assert_eq!(client.total_supply(), 0u128);
}

// ── Edge: transfer all ────────────────────────────────────────────────────────

#[test]
fn test_transfer_all_credits() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.mint_credits(&admin, &alice, &777u128);
    client.transfer_credits(&alice, &bob, &777u128);

    assert_eq!(client.balance(&alice), 0u128);
    assert_eq!(client.balance(&bob), 777u128);
}

// ── Edge: self-transfer ───────────────────────────────────────────────────────

#[test]
fn test_transfer_to_self() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);

    client.mint_credits(&admin, &alice, &500u128);
    client.transfer_credits(&alice, &alice, &200u128);

    assert_eq!(client.balance(&alice), 500u128);
}

// ── Edge: mint to multiple recipients ─────────────────────────────────────────

#[test]
fn test_mint_to_multiple_recipients() {
    let env = Env::default();
    env.mock_all_auths();
    let (admin, client) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    client.mint_credits(&admin, &alice, &100u128);
    client.mint_credits(&admin, &bob, &200u128);
    client.mint_credits(&admin, &carol, &300u128);

    assert_eq!(client.balance(&alice), 100u128);
    assert_eq!(client.balance(&bob), 200u128);
    assert_eq!(client.balance(&carol), 300u128);
    assert_eq!(client.total_supply(), 600u128);
}
