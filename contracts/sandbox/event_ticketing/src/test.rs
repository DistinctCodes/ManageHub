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
    let _token = TokenClient::new(&env, &token_id.address());
    let token_sac = StellarAssetClient::new(&env, &token_id.address());

    let contract_id = env.register_contract(None, EventTicketingContract);
    let client = EventTicketingContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin, &token_id.address());

    // Mint tokens to a default buyer for tests
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

/// Helper: create a standard test event with sensible defaults.
/// start_time = 500, end_time = 1000, ticket_price = 100, capacity = 10
fn create_test_event(
    env: &Env,
    client: &EventTicketingContractClient,
    admin: &Address,
    event_id: &str,
) {
    client.create_event(
        admin,
        &String::from_str(env, event_id),
        &String::from_str(env, "Test Event"),
        &10,         // capacity
        &100,        // ticket_price
        &500,        // start_time
        &1000,       // end_time
    );
}

// ── create_event tests ────────────────────────────────────────────────────────

#[test]
fn test_create_event_succeeds() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-1");

    let e = client.get_event(&String::from_str(&env, "evt-1"));
    assert_eq!(e.status, EventStatus::Active);
    assert_eq!(e.capacity, 10);
    assert_eq!(e.remaining_capacity, 10);
    assert_eq!(e.start_time, 500);
    assert_eq!(e.end_time, 1000);
    assert_eq!(e.ticket_price, 100);
    assert_eq!(e.organizer, admin);
}

#[test]
fn test_create_event_rejects_duplicate() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-dup");

    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-dup"),
            &String::from_str(&env, "Dup"),
            &5,
            &100,
            &500,
            &1000,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventAlreadyExists);
}

#[test]
fn test_create_event_rejects_start_ge_end() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);

    // start_time == end_time
    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-tr1"),
            &String::from_str(&env, "Bad"),
            &10,
            &100,
            &500,
            &500,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidTimeRange);

    // start_time > end_time
    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-tr2"),
            &String::from_str(&env, "Bad"),
            &10,
            &100,
            &600,
            &500,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidTimeRange);
}

#[test]
fn test_create_event_rejects_zero_capacity() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);

    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-cap"),
            &String::from_str(&env, "Zero Cap"),
            &0,
            &100,
            &500,
            &1000,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidCapacity);
}

#[test]
fn test_create_event_rejects_zero_price() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);

    let err = client
        .try_create_event(
            &admin,
            &String::from_str(&env, "evt-prc"),
            &String::from_str(&env, "Free"),
            &10,
            &0,
            &500,
            &1000,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidPrice);
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
            &10,
            &100,
            &500,
            &1000,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

// ── update_availability tests ─────────────────────────────────────────────────

#[test]
fn test_update_availability_succeeds() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-ua");

    client.update_availability(
        &admin,
        &String::from_str(&env, "evt-ua"),
        &20,
    );

    let e = client.get_event(&String::from_str(&env, "evt-ua"));
    assert_eq!(e.capacity, 20);
    assert_eq!(e.remaining_capacity, 20);
}

#[test]
fn test_update_availability_after_sales() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-uas");

    let buyer = funded_buyer(&env, &token);
    client.buy_ticket(
        &buyer,
        &String::from_str(&env, "tkt-1"),
        &String::from_str(&env, "evt-uas"),
    );

    client.update_availability(
        &admin,
        &String::from_str(&env, "evt-uas"),
        &15,
    );

    let e = client.get_event(&String::from_str(&env, "evt-uas"));
    assert_eq!(e.capacity, 15);
    assert_eq!(e.remaining_capacity, 14); // 15 - 1 sold
}

#[test]
fn test_update_availability_rejects_below_sold() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-uab");

    let b1 = funded_buyer(&env, &token);
    client.buy_ticket(
        &b1,
        &String::from_str(&env, "tkt-1"),
        &String::from_str(&env, "evt-uab"),
    );

    // Try to set capacity to 0 (< 1 sold)
    let err = client
        .try_update_availability(
            &admin,
            &String::from_str(&env, "evt-uab"),
            &0,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidCapacity);
}

#[test]
fn test_non_admin_cannot_update_availability() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-uan");

    let non_admin = Address::generate(&env);
    let err = client
        .try_update_availability(
            &non_admin,
            &String::from_str(&env, "evt-uan"),
            &20,
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

// ── close_event tests ─────────────────────────────────────────────────────────

#[test]
fn test_close_event_succeeds() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-cl");

    client.close_event(&admin, &String::from_str(&env, "evt-cl"));

    let e = client.get_event(&String::from_str(&env, "evt-cl"));
    assert_eq!(e.status, EventStatus::Completed);
}

#[test]
fn test_close_event_rejects_non_active() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-cl2");

    client.close_event(&admin, &String::from_str(&env, "evt-cl2"));

    // Trying to close again should fail
    let err = client
        .try_close_event(&admin, &String::from_str(&env, "evt-cl2"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventNotActive);
}

#[test]
fn test_non_admin_cannot_close_event() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-clna");

    let non_admin = Address::generate(&env);
    let err = client
        .try_close_event(&non_admin, &String::from_str(&env, "evt-clna"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

// ── cancel_event tests ────────────────────────────────────────────────────────

#[test]
fn test_cancel_event_succeeds() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-cnc");

    client.cancel_event(&admin, &String::from_str(&env, "evt-cnc"));

    let e = client.get_event(&String::from_str(&env, "evt-cnc"));
    assert_eq!(e.status, EventStatus::Cancelled);
}

#[test]
fn test_non_admin_cannot_cancel_event() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-nac");

    let non_admin = Address::generate(&env);
    let err = client
        .try_cancel_event(&non_admin, &String::from_str(&env, "evt-nac"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

// ── buy_ticket tests ──────────────────────────────────────────────────────────

#[test]
fn test_buy_ticket_transfers_payment_and_decrements_capacity() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-buy");

    let buyer = funded_buyer(&env, &token);
    client.buy_ticket(
        &buyer,
        &String::from_str(&env, "tkt-buy"),
        &String::from_str(&env, "evt-buy"),
    );

    let e = client.get_event(&String::from_str(&env, "evt-buy"));
    assert_eq!(e.remaining_capacity, 9);

    let t = client.get_ticket(&String::from_str(&env, "tkt-buy"));
    assert_eq!(t.owner, buyer);
    assert_eq!(t.status, TicketStatus::Active);
    assert_eq!(t.price_paid, 100);
}

#[test]
fn test_buy_ticket_fails_when_sold_out() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    // capacity = 1
    client.create_event(
        &admin,
        &String::from_str(&env, "evt-so"),
        &String::from_str(&env, "Sold Out Event"),
        &1,
        &100,
        &500,
        &1000,
    );

    let b1 = funded_buyer(&env, &token);
    client.buy_ticket(
        &b1,
        &String::from_str(&env, "tkt-so-1"),
        &String::from_str(&env, "evt-so"),
    );

    let b2 = funded_buyer(&env, &token);
    let err = client
        .try_buy_ticket(
            &b2,
            &String::from_str(&env, "tkt-so-2"),
            &String::from_str(&env, "evt-so"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventSoldOut);
}

#[test]
fn test_buy_ticket_fails_when_event_cancelled() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-canc");

    client.cancel_event(&admin, &String::from_str(&env, "evt-canc"));

    let buyer = funded_buyer(&env, &token);
    let err = client
        .try_buy_ticket(
            &buyer,
            &String::from_str(&env, "tkt-c"),
            &String::from_str(&env, "evt-canc"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventCancelled);
}

#[test]
fn test_buy_ticket_fails_when_event_closed() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-closed");

    client.close_event(&admin, &String::from_str(&env, "evt-closed"));

    let buyer = funded_buyer(&env, &token);
    let err = client
        .try_buy_ticket(
            &buyer,
            &String::from_str(&env, "tkt-cl"),
            &String::from_str(&env, "evt-closed"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::EventNotActive);
}

// ── transfer_ticket tests ─────────────────────────────────────────────────────

#[test]
fn test_transfer_ticket_changes_ownership() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-tr");

    let buyer = funded_buyer(&env, &token);
    client.buy_ticket(
        &buyer,
        &String::from_str(&env, "tkt-tr"),
        &String::from_str(&env, "evt-tr"),
    );

    let new_owner = Address::generate(&env);
    client.transfer_ticket(
        &buyer,
        &new_owner,
        &String::from_str(&env, "tkt-tr"),
    );

    let t = client.get_ticket(&String::from_str(&env, "tkt-tr"));
    assert_eq!(t.owner, new_owner);
}

#[test]
fn test_transfer_ticket_fails_after_event_start() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-ts");

    let buyer = funded_buyer(&env, &token);
    client.buy_ticket(
        &buyer,
        &String::from_str(&env, "tkt-ts"),
        &String::from_str(&env, "evt-ts"),
    );

    // Advance past start_time (500)
    env.ledger().set_timestamp(600);
    let new_owner = Address::generate(&env);
    let err = client
        .try_transfer_ticket(
            &buyer,
            &new_owner,
            &String::from_str(&env, "tkt-ts"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::TicketNotTransferable);
}

// ── cancel_ticket tests ───────────────────────────────────────────────────────

#[test]
fn test_cancel_ticket_refunds_and_restores_capacity() {
    let (env, client, admin, token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-ref");

    let buyer = funded_buyer(&env, &token);
    client.buy_ticket(
        &buyer,
        &String::from_str(&env, "tkt-ref"),
        &String::from_str(&env, "evt-ref"),
    );

    client.cancel_ticket(&buyer, &String::from_str(&env, "tkt-ref"));

    let e = client.get_event(&String::from_str(&env, "evt-ref"));
    assert_eq!(e.remaining_capacity, 10);

    let t = client.get_ticket(&String::from_str(&env, "tkt-ref"));
    assert_eq!(t.status, TicketStatus::Cancelled);
}

// ── query tests ───────────────────────────────────────────────────────────────

#[test]
fn test_check_event_availability() {
    let (env, client, admin, _token) = setup();
    env.ledger().set_timestamp(100);
    create_test_event(&env, &client, &admin, "evt-avail");

    assert!(client.check_event_availability(&String::from_str(&env, "evt-avail")));

    client.cancel_event(&admin, &String::from_str(&env, "evt-avail"));

    assert!(!client.check_event_availability(&String::from_str(&env, "evt-avail")));
}
