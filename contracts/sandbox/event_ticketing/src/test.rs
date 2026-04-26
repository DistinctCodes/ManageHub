#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Env, String,
};

fn setup() -> (Env, EventTicketingContractClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy a mock token
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token = TokenClient::new(&env, &token_id.address());
    let token_sac = StellarAssetClient::new(&env, &token_id.address());

    let contract_id = env.register_contract(None, EventTicketingContract);
    let client = EventTicketingContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client
        .initialize(&admin, &token_id.address())
        .unwrap();

    // Mint tokens to a few buyers for tests
    let buyer = Address::generate(&env);
    token_sac.mint(&buyer, &1_000_000);

    (env, client, admin, token_id.address())
}

fn funded_buyer(env: &Env, token_addr: &Address) -> Address {
    let buyer = Address::generate(env);
    let sac = StellarAssetClient::new(env, token_addr);
    sac.mint(&buyer, &1_000_000);
    buyer
}

fn create_test_event(
    env: &Env,
    client: &EventTicketingContractClient,
    admin: &Address,
    event_id: &str,
    start_time: u64,
) {
    client
        .create_event(
            admin,
            &String::from_str(env, event_id),
            &String::from_str(env, "Test Event"),
            &start_time,
            &100,
            &10,
        )
        .unwrap();
}

// ── CT-14 tests ───────────────────────────────────────────────────────────────

#[test]
fn test_create_event_succeeds() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-1", 500);
    let e = client.get_event(&String::from_str(&env, "evt-1")).unwrap();
    assert_eq!(e.status, EventStatus::Active);
    assert_eq!(e.capacity, 10);
}

#[test]
fn test_create_event_rejects_duplicate() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-dup", 500);
    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-dup"),
            &String::from_str(&env, "Dup"),
            &500,
            &100,
            &5,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventAlreadyExists);
}

#[test]
fn test_buy_ticket_transfers_payment_and_decrements_capacity() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-buy", 500);
    let buyer = funded_buyer(&env, &token);
    client
        .buy_ticket(
            &buyer,
            &String::from_str(&env, "evt-buy"),
            &String::from_str(&env, "tkt-1"),
        )
        .unwrap();
    let e = client
        .get_event(&String::from_str(&env, "evt-buy"))
        .unwrap();
    assert_eq!(e.tickets_sold, 1);
    let t = client
        .get_ticket(&String::from_str(&env, "tkt-1"))
        .unwrap();
    assert_eq!(t.owner, buyer);
    assert_eq!(t.status, TicketStatus::Valid);
}

#[test]
fn test_buy_ticket_fails_when_sold_out() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    // capacity = 1
    client
        .create_event(
            &admin,
            &String::from_str(&env, "evt-so"),
            &String::from_str(&env, "Sold Out Event"),
            &500,
            &100,
            &1,
        )
        .unwrap();
    let b1 = funded_buyer(&env, &token);
    client
        .buy_ticket(
            &b1,
            &String::from_str(&env, "evt-so"),
            &String::from_str(&env, "tkt-so-1"),
        )
        .unwrap();
    let b2 = funded_buyer(&env, &token);
    let err = client
        .try_buy_ticket(
            &b2,
            &String::from_str(&env, "evt-so"),
            &String::from_str(&env, "tkt-so-2"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::SoldOut);
}

#[test]
fn test_buy_ticket_fails_when_event_cancelled() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-canc", 500);
    client
        .cancel_event(&admin, &String::from_str(&env, "evt-canc"))
        .unwrap();
    let buyer = funded_buyer(&env, &token);
    let err = client
        .try_buy_ticket(
            &buyer,
            &String::from_str(&env, "evt-canc"),
            &String::from_str(&env, "tkt-c"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventCancelled);
}

#[test]
fn test_transfer_ticket_changes_ownership() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-tr", 500);
    let buyer = funded_buyer(&env, &token);
    client
        .buy_ticket(
            &buyer,
            &String::from_str(&env, "evt-tr"),
            &String::from_str(&env, "tkt-tr"),
        )
        .unwrap();
    let new_owner = Address::generate(&env);
    client
        .transfer_ticket(
            &buyer,
            &String::from_str(&env, "tkt-tr"),
            &new_owner,
        )
        .unwrap();
    let t = client
        .get_ticket(&String::from_str(&env, "tkt-tr"))
        .unwrap();
    assert_eq!(t.owner, new_owner);
}

#[test]
fn test_transfer_ticket_fails_after_event_start() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-ts", 200);
    let buyer = funded_buyer(&env, &token);
    client
        .buy_ticket(
            &buyer,
            &String::from_str(&env, "evt-ts"),
            &String::from_str(&env, "tkt-ts"),
        )
        .unwrap();
    // Advance past start_time
    env.ledger().set_timestamp(300);
    let new_owner = Address::generate(&env);
    let err = client
        .try_transfer_ticket(
            &buyer,
            &String::from_str(&env, "tkt-ts"),
            &new_owner,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::TransferAfterStart);
}

#[test]
fn test_cancel_ticket_refunds_and_restores_capacity() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-ref", 500);
    let buyer = funded_buyer(&env, &token);
    client
        .buy_ticket(
            &buyer,
            &String::from_str(&env, "evt-ref"),
            &String::from_str(&env, "tkt-ref"),
        )
        .unwrap();
    client
        .cancel_ticket(&buyer, &String::from_str(&env, "tkt-ref"))
        .unwrap();
    let e = client
        .get_event(&String::from_str(&env, "evt-ref"))
        .unwrap();
    assert_eq!(e.tickets_sold, 0);
    let t = client
        .get_ticket(&String::from_str(&env, "tkt-ref"))
        .unwrap();
    assert_eq!(t.status, TicketStatus::Cancelled);
}

#[test]
fn test_non_admin_cannot_create_event() {
    let (env, client, _admin, _token) = setup();
    let non_admin = Address::generate(&env);
    let err = client
        .try_create_event(
            &non_admin,
            &String::from_str(&env, "evt-na"),
            &String::from_str(&env, "Unauth"),
            &500,
            &100,
            &5,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_non_admin_cannot_cancel_event() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-nac", 500);
    let non_admin = Address::generate(&env);
    let err = client
        .try_cancel_event(&non_admin, &String::from_str(&env, "evt-nac"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}
