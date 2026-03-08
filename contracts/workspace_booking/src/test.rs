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

#[test]
fn test_register_workspace_success() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &token);

    client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Hot Desk A"),
        &WorkspaceType::HotDesk,
        &1u32,
        &500i128,
    );

    let ws = client.get_workspace(&String::from_str(&env, "ws-001"));
    assert_eq!(ws.name, String::from_str(&env, "Hot Desk A"));
    assert_eq!(ws.workspace_type, WorkspaceType::HotDesk);
    assert_eq!(ws.capacity, 1u32);
    assert_eq!(ws.hourly_rate, 500i128);
    assert!(ws.is_available);

    let all = client.get_all_workspaces();
    assert_eq!(all.len(), 1u32);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_register_workspace_duplicate_id_fails() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &token);

    client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Hot Desk A"),
        &WorkspaceType::HotDesk,
        &1u32,
        &500i128,
    );
    // WorkspaceAlreadyExists = 5
    client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Hot Desk B"),
        &WorkspaceType::HotDesk,
        &1u32,
        &500i128,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_register_workspace_non_admin_fails() {
    let env = Env::default();
    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin, &token);
    // Unauthorized = 2
    client.register_workspace(
        &non_admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Hot Desk A"),
        &WorkspaceType::HotDesk,
        &1u32,
        &500i128,
    );
}

#[test]
fn test_book_workspace_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let member = Address::generate(&env);
    let token_address = setup_token(&env, &admin, &member, 10_000i128);

    client.initialize(&admin, &token_address);
    client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Meeting Room Alpha"),
        &WorkspaceType::MeetingRoom,
        &10u32,
        &1_000i128, // 1000 units/hr
    );

    // Book for 2 hours starting 60 seconds from now
    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 7_200; // 2 hours

    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    let booking = client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.workspace_id, String::from_str(&env, "ws-001"));
    assert_eq!(booking.member, member);
    assert_eq!(booking.status, BookingStatus::Active);
    assert_eq!(booking.amount_paid, 2_000i128); // 2 hrs × 1000

    // Member balance should have decreased
    let balance = TokenClient::new(&env, &token_address).balance(&member);
    assert_eq!(balance, 10_000 - 2_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_book_workspace_conflict_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let member = Address::generate(&env);
    let token_address = setup_token(&env, &admin, &member, 50_000i128);

    client.initialize(&admin, &token_address);
    client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Desk A"),
        &WorkspaceType::HotDesk,
        &1u32,
        &500i128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600;

    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    // Second booking overlaps — BookingConflict = 7
    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-002"),
        &String::from_str(&env, "ws-001"),
        &(start + 1_800), // starts in the middle of first booking
        &(end + 1_800),
    );
}
