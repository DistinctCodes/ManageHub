#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

use workspace_booking::{BookingStatus as WbBookingStatus, WorkspaceType, WorkspaceBookingContract};
use payment_escrow::{EscrowStatus, PaymentEscrowContract};
use resource_credits::ResourceCreditsContract;

// ── Helpers ───────────────────────────────────────────────────────────────────

fn advance_time(env: &Env, seconds: u64) {
    env.ledger().with_mut(|l| l.timestamp += seconds);
}

fn setup_token(env: &Env, admin: &Address, recipient: &Address, amount: i128) -> Address {
    let token_address = env
        .register_stellar_asset_contract_v2(admin.clone())
        .address();
    StellarAssetClient::new(env, &token_address)
        .mock_all_auths()
        .mint(recipient, &amount);
    token_address
}

// ── Test 1: Booking → Payment escrow → Release funds → Complete booking ───────

#[test]
fn test_booking_then_escrow_release() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let token = setup_token(&env, &admin, &member, 100_000i128);

    let booking_id = env.register(WorkspaceBookingContract, ());
    let booking_client = workspace_booking::WorkspaceBookingContractClient::new(&env, &booking_id);
    booking_client.initialize(&admin, &token);

    let escrow_id = env.register(PaymentEscrowContract, ());
    let escrow_client = payment_escrow::PaymentEscrowContractClient::new(&env, &escrow_id);
    escrow_client.initialize(&admin, &token, &86_400u64);

    booking_client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Hot Desk A"),
        &WorkspaceType::HotDesk,
        &1u32,
        &1_000u128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 7_200;

    booking_client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    let booking = booking_client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, WbBookingStatus::Active);
    assert_eq!(booking.amount_paid, 2_000u128);

    escrow_client.create_escrow(
        &member,
        &String::from_str(&env, "esc-001"),
        &admin,
        &5_000i128,
        &String::from_str(&env, "Security deposit for ws-001"),
        &0u64,
    );

    let escrow = escrow_client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.status, EscrowStatus::Pending);
    assert_eq!(escrow.amount, 5_000i128);

    escrow_client.release(&admin, &String::from_str(&env, "esc-001"));

    let escrow = escrow_client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.status, EscrowStatus::Released);

    let hub_balance = TokenClient::new(&env, &token).balance(&admin);
    assert_eq!(hub_balance, 5_000i128);

    advance_time(&env, 8_000);

    booking_client.complete_booking(&admin, &String::from_str(&env, "booking-001"));
    let booking = booking_client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, WbBookingStatus::Completed);
}

// ── Test 2: Booking → Escrow with dispute → Refund ───────────────────────────

#[test]
fn test_booking_escrow_dispute_and_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let token = setup_token(&env, &admin, &member, 100_000i128);

    let booking_addr = env.register(WorkspaceBookingContract, ());
    let booking_client = workspace_booking::WorkspaceBookingContractClient::new(&env, &booking_addr);
    booking_client.initialize(&admin, &token);

    let escrow_addr = env.register(PaymentEscrowContract, ());
    let escrow_client = payment_escrow::PaymentEscrowContractClient::new(&env, &escrow_addr);
    escrow_client.initialize(&admin, &token, &86_400u64);

    booking_client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Desk"),
        &WorkspaceType::DedicatedDesk,
        &1u32,
        &500u128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600;

    booking_client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    escrow_client.create_escrow(
        &member,
        &String::from_str(&env, "esc-001"),
        &admin,
        &3_000i128,
        &String::from_str(&env, "Deposit for ws-001"),
        &0u64,
    );

    advance_time(&env, 3_600);
    escrow_client.raise_dispute(&member, &String::from_str(&env, "esc-001"));

    let escrow = escrow_client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.status, EscrowStatus::Disputed);

    escrow_client.resolve_dispute(&admin, &String::from_str(&env, "esc-001"), &false);

    let escrow = escrow_client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.status, EscrowStatus::Refunded);

    let member_balance = TokenClient::new(&env, &token).balance(&member);
    // 100_000 initial - 500 booking - 3_000 escrow + 3_000 refund = 99_500
    assert_eq!(member_balance, 99_500i128);
}

// ── Test 3: Resource credits — mint → transfer → spend → check balance ────────

#[test]
fn test_resource_credits_mint_transfer_spend() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let token = setup_token(&env, &admin, &alice, 0i128);

    let rc_id = env.register(ResourceCreditsContract, ());
    let rc_client = resource_credits::ResourceCreditsContractClient::new(&env, &rc_id);
    rc_client.initialize(&admin, &token);

    rc_client.mint_credits(&admin, &alice, &1_000u128);
    assert_eq!(rc_client.balance(&alice), 1_000u128);
    assert_eq!(rc_client.total_supply(), 1_000u128);

    rc_client.transfer_credits(&alice, &bob, &300u128);
    assert_eq!(rc_client.balance(&alice), 700u128);
    assert_eq!(rc_client.balance(&bob), 300u128);
    assert_eq!(rc_client.total_supply(), 1_000u128);

    rc_client.spend_credits(&bob, &100u128);
    assert_eq!(rc_client.balance(&bob), 200u128);
    assert_eq!(rc_client.total_supply(), 900u128);

    rc_client.spend_credits(&alice, &200u128);
    assert_eq!(rc_client.balance(&alice), 500u128);
    assert_eq!(rc_client.total_supply(), 700u128);

    assert_eq!(rc_client.balance(&alice), 500u128);
    assert_eq!(rc_client.balance(&bob), 200u128);
    assert_eq!(rc_client.total_supply(), 700u128);
}

// ── Test 4: Resource credits — mint to multiple users ─────────────────────────

#[test]
fn test_resource_credits_independent_balances() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token = setup_token(&env, &admin, &user1, 0i128);

    let rc_id = env.register(ResourceCreditsContract, ());
    let rc_client = resource_credits::ResourceCreditsContractClient::new(&env, &rc_id);
    rc_client.initialize(&admin, &token);

    rc_client.mint_credits(&admin, &user1, &5_000u128);
    rc_client.mint_credits(&admin, &user2, &2_500u128);

    assert_eq!(rc_client.balance(&user1), 5_000u128);
    assert_eq!(rc_client.balance(&user2), 2_500u128);
    assert_eq!(rc_client.total_supply(), 7_500u128);

    rc_client.spend_credits(&user1, &1_000u128);
    assert_eq!(rc_client.balance(&user1), 4_000u128);
    assert_eq!(rc_client.balance(&user2), 2_500u128);
    assert_eq!(rc_client.total_supply(), 6_500u128);
}

// ── Test 5: Cross-contract — workspace booking + resource credits ─────────────

#[test]
fn test_booking_with_resource_credits() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let token = setup_token(&env, &admin, &member, 50_000i128);

    let booking_addr = env.register(WorkspaceBookingContract, ());
    let booking_client = workspace_booking::WorkspaceBookingContractClient::new(&env, &booking_addr);
    booking_client.initialize(&admin, &token);

    let rc_addr = env.register(ResourceCreditsContract, ());
    let rc_client = resource_credits::ResourceCreditsContractClient::new(&env, &rc_addr);
    rc_client.initialize(&admin, &token);

    rc_client.mint_credits(&admin, &member, &500u128);

    booking_client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Premium Desk"),
        &WorkspaceType::DedicatedDesk,
        &1u32,
        &1_000u128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 3_600;

    booking_client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    rc_client.spend_credits(&member, &100u128);

    let booking = booking_client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, WbBookingStatus::Active);
    assert_eq!(booking.amount_paid, 1_000u128);

    assert_eq!(rc_client.balance(&member), 400u128);

    let member_token_balance = TokenClient::new(&env, &token).balance(&member);
    assert_eq!(member_token_balance, 49_000i128);

    advance_time(&env, 4_000);
    booking_client.complete_booking(&admin, &String::from_str(&env, "booking-001"));

    let booking = booking_client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, WbBookingStatus::Completed);
}

// ── Test 6: Cancel booking + escrow refund in sequence ────────────────────────

#[test]
fn test_cancel_booking_and_refund_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let member = Address::generate(&env);

    let token = setup_token(&env, &admin, &member, 100_000i128);

    let booking_addr = env.register(WorkspaceBookingContract, ());
    let booking_client = workspace_booking::WorkspaceBookingContractClient::new(&env, &booking_addr);
    booking_client.initialize(&admin, &token);

    let escrow_addr = env.register(PaymentEscrowContract, ());
    let escrow_client = payment_escrow::PaymentEscrowContractClient::new(&env, &escrow_addr);
    escrow_client.initialize(&admin, &token, &86_400u64);

    booking_client.register_workspace(
        &admin,
        &String::from_str(&env, "ws-001"),
        &String::from_str(&env, "Office"),
        &WorkspaceType::PrivateOffice,
        &4u32,
        &2_000u128,
    );

    let now = env.ledger().timestamp();
    let start = now + 60;
    let end = start + 7_200;

    booking_client.book_workspace(
        &member,
        &String::from_str(&env, "booking-001"),
        &String::from_str(&env, "ws-001"),
        &start,
        &end,
    );

    let balance_after_booking = TokenClient::new(&env, &token).balance(&member);
    assert_eq!(balance_after_booking, 96_000i128);

    escrow_client.create_escrow(
        &member,
        &String::from_str(&env, "esc-001"),
        &admin,
        &10_000i128,
        &String::from_str(&env, "Office deposit"),
        &0u64,
    );

    let balance_after_escrow = TokenClient::new(&env, &token).balance(&member);
    assert_eq!(balance_after_escrow, 86_000i128);

    booking_client.cancel_booking(&member, &String::from_str(&env, "booking-001"));

    let balance_after_cancel = TokenClient::new(&env, &token).balance(&member);
    assert_eq!(balance_after_cancel, 90_000i128);

    escrow_client.refund(&admin, &String::from_str(&env, "esc-001"));

    let final_balance = TokenClient::new(&env, &token).balance(&member);
    assert_eq!(final_balance, 100_000i128);

    let booking = booking_client.get_booking(&String::from_str(&env, "booking-001"));
    assert_eq!(booking.status, WbBookingStatus::Cancelled);

    let escrow = escrow_client.get_escrow(&String::from_str(&env, "esc-001"));
    assert_eq!(escrow.status, EscrowStatus::Refunded);
}
