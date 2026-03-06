// contracts/payment_escrow/src/test.rs
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DISPUTE_WINDOW: u64 = 86_400;

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

// ── Escrow creation ───────────────────────────────────────────────────────────

#[test]
fn test_create_escrow_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let token = setup_token(&env, &admin, &depositor, 10_000);

    let contract_id = setup_contract(&env);
    let client = init(&env, &contract_id, &admin, &token);

    client.create_escrow(
        &depositor,
        &String::from_str(&env, "esc-001"),
        &beneficiary,
        &5_000i128,
        &String::from_str(&env, "Security deposit – booking ws-001"),
        &0u64,
    );

    let escrow = client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.depositor, depositor);
    assert_eq!(escrow.beneficiary, beneficiary);
    assert_eq!(escrow.amount, 5_000i128);
    assert_eq!(escrow.status, EscrowStatus::Pending);
    assert_eq!(escrow.dispute_window, DISPUTE_WINDOW);
    assert_eq!(escrow.release_after, 0u64);

    // Contract should now hold the funds
    assert_eq!(TokenClient::new(&env, &token).balance(&contract_id), 5_000);
    assert_eq!(TokenClient::new(&env, &token).balance(&depositor), 5_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_create_escrow_duplicate_id_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let token = setup_token(&env, &admin, &depositor, 20_000);

    let contract_id = setup_contract(&env);
    let client = init(&env, &contract_id, &admin, &token);

    client.create_escrow(
        &depositor,
        &String::from_str(&env, "esc-001"),
        &beneficiary,
        &5_000i128,
        &String::from_str(&env, "Deposit A"),
        &0u64,
    );
    // EscrowAlreadyExists = 5
    client.create_escrow(
        &depositor,
        &String::from_str(&env, "esc-001"),
        &beneficiary,
        &5_000i128,
        &String::from_str(&env, "Deposit B"),
        &0u64,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #11)")]
fn test_create_escrow_zero_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let token = setup_token(&env, &admin, &depositor, 10_000);

    let contract_id = setup_contract(&env);
    let client = init(&env, &contract_id, &admin, &token);

    // InvalidAmount = 11
    client.create_escrow(
        &depositor,
        &String::from_str(&env, "esc-001"),
        &beneficiary,
        &0i128,
        &String::from_str(&env, "Zero deposit"),
        &0u64,
    );
}
