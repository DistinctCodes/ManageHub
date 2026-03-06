// contracts/payment_escrow/src/test.rs
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPUTE_WINDOW: u64 = 86_400; // 24 hours in seconds

fn setup_contract(env: &Env) -> Address {
    env.register(PaymentEscrowContract, ())
}

fn setup_token(env: &Env, admin: &Address, recipient: &Address, amount: i128) -> Address {
    let token_address = env.register_stellar_asset_contract_v2(admin.clone()).address();
    StellarAssetClient::new(env, &token_address)
        .mock_all_auths()
        .mint(recipient, &amount);
    token_address
}

fn advance_time(env: &Env, seconds: u64) {
    env.ledger().with_mut(|l| l.timestamp += seconds);
}

/// Initialise the contract and return the client.
fn init<'a>(
    env: &'a Env,
    contract_id: &Address,
    admin: &Address,
    token: &Address,
) -> PaymentEscrowContractClient<'a> {
    let client = PaymentEscrowContractClient::new(env, contract_id);
    client.initialize(admin, token, &DISPUTE_WINDOW);
    client
}

// ── Initialisation ────────────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    let client = init(&env, &contract_id, &admin, &token);

    assert_eq!(client.admin(), admin);
    assert_eq!(client.payment_token(), token);
    assert_eq!(client.dispute_window(), DISPUTE_WINDOW);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_initialize_twice_fails() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    let client = PaymentEscrowContractClient::new(&env, &contract_id);
    client.initialize(&admin, &token, &DISPUTE_WINDOW);
    client.initialize(&admin, &token, &DISPUTE_WINDOW); // AlreadyInitialized = 3
}
