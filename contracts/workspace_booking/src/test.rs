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
    let token_address = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
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
        &500i128, // 500 units per hour
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

#[test]
fn test_cancel_booking_refunds_member() {
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
        &String::from_str(&env, "Private Office"),
        &WorkspaceType::PrivateOffice,
        &4u32,
        &2_000i128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600; // 1 hour → cost 2000

    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    let balance_after_booking = TokenClient::new(&env, &token_address).balance(&member);
    assert_eq!(balance_after_booking, 8_000i128);

    client.cancel_booking(&member, &String::from_str(&env, "booking-001"));

    let balance_after_cancel = TokenClient::new(&env, &token_address).balance(&member);
    assert_eq!(balance_after_cancel, 10_000i128); // full refund

    let booking = client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, BookingStatus::Cancelled);
}

#[test]
fn test_complete_booking_by_admin() {
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
        &String::from_str(&env, "Dedicated Desk"),
        &WorkspaceType::DedicatedDesk,
        &1u32,
        &300i128,
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

    // Advance time past end
    advance_time(&env, 4_000);

    client.complete_booking(&admin, &String::from_str(&env, "booking-001"));

    let booking = client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, BookingStatus::Completed);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_cancel_already_cancelled_fails() {
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
        &String::from_str(&env, "Hot Desk"),
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

    client.cancel_booking(&member, &String::from_str(&env, "booking-001"));
    // BookingNotActive = 10
    client.cancel_booking(&member, &String::from_str(&env, "booking-001"));
}

#[test]
fn test_check_availability_no_conflict() {
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
        &String::from_str(&env, "Room B"),
        &WorkspaceType::MeetingRoom,
        &8u32,
        &1_500i128,
    );

    let now = env.ledger().timestamp();
    let start = now + 3_600;
    let end = start + 3_600;

    // No bookings yet — should be available
    assert!(client.check_availability(&String::from_str(&env, "ws-001"), &start, &end));

    // Book it
    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    // Same slot should no longer be available
    assert!(!client.check_availability(&String::from_str(&env, "ws-001"), &start, &end));

    // Non-overlapping slot after the booking should still be available
    assert!(client.check_availability(&String::from_str(&env, "ws-001"), &end, &(end + 3_600)));
}

#[test]
fn test_set_workspace_availability_blocks_new_bookings() {
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
        &String::from_str(&env, "Desk C"),
        &WorkspaceType::HotDesk,
        &1u32,
        &400i128,
    );

    // Disable the workspace
    client.set_workspace_availability(&admin, &String::from_str(&env, "ws-001"), &false);

    assert!(!client.check_availability(
        &String::from_str(&env, "ws-001"),
        &(env.ledger().timestamp() + 60),
        &(env.ledger().timestamp() + 3_660)
    ));
}

#[test]
fn test_multiple_workspaces_independent_availability() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = setup_contract(&env);
    let client = WorkspaceBookingContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let member = Address::generate(&env);
    let token_address = setup_token(&env, &admin, &member, 50_000i128);

    client.initialize(&admin, &token_address);

    for i in 0u32..3 {
        let id = match i {
            0 => String::from_str(&env, "ws-001"),
            1 => String::from_str(&env, "ws-002"),
            _ => String::from_str(&env, "ws-003"),
        };
        client.register_workspace(
            &admin,
            &id,
            &String::from_str(&env, "Workspace"),
            &WorkspaceType::HotDesk,
            &1u32,
            &500i128,
        );
    }

    assert_eq!(client.get_all_workspaces().len(), 3u32);

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600;

    // Book ws-001 for the slot
    client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    // ws-002 and ws-003 should still be available for the same slot
    assert!(client.check_availability(&String::from_str(&env, "ws-002"), &start, &end));
    assert!(client.check_availability(&String::from_str(&env, "ws-003"), &start, &end));
    // ws-001 should NOT be available
    assert!(!client.check_availability(&String::from_str(&env, "ws-001"), &start, &end));
}

#[test]
fn test_member_and_workspace_booking_indexes() {
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
        &WorkspaceType::DedicatedDesk,
        &1u32,
        &300i128,
    );

    let now = env.ledger().timestamp();

    // Make two non-overlapping bookings for the same member and workspace
    let s1 = now + 100;
    let e1 = s1 + 3_600;
    let s2 = e1 + 600;
    let e2 = s2 + 3_600;

    client.book_workspace(
        &member,
        &String::from_str(&env, "bk-1"),
        &String::from_str(&env, "ws-001"),
        &s1,
        &e1,
    );
    client.book_workspace(
        &member,
        &String::from_str(&env, "bk-2"),
        &String::from_str(&env, "ws-001"),
        &s2,
        &e2,
    );

    assert_eq!(client.get_member_bookings(&member).len(), 2u32);
    assert_eq!(
        client
            .get_workspace_bookings(&String::from_str(&env, "ws-001"))
            .len(),
        2u32
    );
}

#[test]
fn test_hourly_rate_update_applies_to_future_bookings() {
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
        &String::from_str(&env, "Office"),
        &WorkspaceType::PrivateOffice,
        &1u32,
        &1_000i128,
    );

    // Update rate to 2000
    client.set_workspace_rate(&admin, &String::from_str(&env, "ws-001"), &2_000i128);

    let ws = client.get_workspace(&String::from_str(&env, "ws-001"));
    assert_eq!(ws.hourly_rate, 2_000i128);

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600; // 1 hour

    client.book_workspace(
        &member,
        &String::from_str(&env, "bk-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    let booking = client.get_booking(&String::from_str(&env, "bk-001"));
    assert_eq!(booking.amount_paid, 2_000i128); // new rate applied
}
