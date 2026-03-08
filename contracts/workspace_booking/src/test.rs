// contracts/workspace_booking/src/test.rs
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Register the workspace_booking contract and return its address.
fn setup_contract(env: &Env) -> Address {
    env.register(WorkspaceBookingContract, ())
}

/// Register a mock token (Stellar Asset Contract), mint `amount` to `recipient`,
/// and return the token address.
fn setup_token(env: &Env, admin: &Address, recipient: &Address, amount: i128) -> Address {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    StellarAssetClient::new(env, &token_address)
        .mock_all_auths()
        .mint(recipient, &amount);
    token_address
}

/// Advance the ledger timestamp by `seconds`.
fn advance_time(env: &Env, seconds: u64) {
    env.ledger().with_mut(|l| l.timestamp += seconds);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &token);

    assert_eq!(client.admin(), admin);
    assert_eq!(client.payment_token(), token);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &token);
    client.initialize(&admin, &token); // AlreadyInitialized = 3
}
