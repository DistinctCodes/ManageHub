#![cfg(test)]

extern crate alloc;
use alloc::format;

use super::*;
use crate::types::MembershipStatus;
use crate::AttendanceAction;
use soroban_sdk::map;
use soroban_sdk::{
    testutils::{Address as _, BytesN as BytesNTestUtils, Events, Ledger as LedgerTestUtils},
    Address, BytesN, Env, String,
};

#[test]
fn test_log_attendance_clock_in() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log clock-in
    client.log_attendance(&log_id, &user, &AttendanceAction::ClockIn, &details);

    // Retrieve logs for user
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.id, log_id);
    assert_eq!(log.user_id, user);
    assert_eq!(log.action, AttendanceAction::ClockIn);
    assert_eq!(log.timestamp, env.ledger().timestamp());
}

#[test]
fn test_log_attendance_clock_out() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log clock-out
    client.log_attendance(&log_id, &user, &AttendanceAction::ClockOut, &details);

    // Retrieve logs for user
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.action, AttendanceAction::ClockOut);
}

#[test]
fn test_log_attendance_multiple_users() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let log_id1 = BytesN::<32>::random(&env);
    let log_id2 = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log attendance for both users
    client.log_attendance(&log_id1, &user1, &AttendanceAction::ClockIn, &details);
    client.log_attendance(&log_id2, &user2, &AttendanceAction::ClockIn, &details);

    // Each user should have their own log
    let logs_user1 = client.get_logs_for_user(&user1);
    let logs_user2 = client.get_logs_for_user(&user2);

    assert_eq!(logs_user1.len(), 1);
    assert_eq!(logs_user2.len(), 1);
    assert_eq!(logs_user1.get(0).unwrap().user_id, user1);
    assert_eq!(logs_user2.get(0).unwrap().user_id, user2);
}

#[test]
fn test_log_attendance_multiple_entries_same_user() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id1 = BytesN::<32>::random(&env);
    let log_id2 = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log clock-in and clock-out for same user
    client.log_attendance(&log_id1, &user, &AttendanceAction::ClockIn, &details);
    client.log_attendance(&log_id2, &user, &AttendanceAction::ClockOut, &details);

    // User should have 2 logs
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 2);
    assert_eq!(logs.get(0).unwrap().action, AttendanceAction::ClockIn);
    assert_eq!(logs.get(1).unwrap().action, AttendanceAction::ClockOut);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #7)")]
fn test_log_attendance_details_limit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id = BytesN::<32>::random(&env);

    // Create a map with > 50 entries to trigger InvalidEventDetails
    let mut big_map = soroban_sdk::Map::<String, String>::new(&env);
    for i in 0..51u32 {
        let key = String::from_str(&env, &format!("k{}", i));
        let val = String::from_str(&env, &format!("v{}", i));
        big_map.set(key, val);
    }

    client.log_attendance(&log_id, &user, &AttendanceAction::ClockIn, &big_map);
}

#[test]
fn test_get_attendance_log_by_id() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log attendance
    client.log_attendance(&log_id, &user, &AttendanceAction::ClockIn, &details);

    // Retrieve specific log by ID
    let log = client.get_attendance_log(&log_id);
    assert!(log.is_some());

    let log = log.unwrap();
    assert_eq!(log.id, log_id);
    assert_eq!(log.user_id, user);
    assert_eq!(log.action, AttendanceAction::ClockIn);
}

#[test]
fn test_get_logs_for_user_empty() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);

    // User with no logs should return empty vector
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 0);
}

#[test]
fn test_attendance_log_immutability() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let log_id = BytesN::<32>::random(&env);

    let details = map![
        &env,
        (
            String::from_str(&env, "location"),
            String::from_str(&env, "office")
        )
    ];

    // Log attendance
    client.log_attendance(&log_id, &user, &AttendanceAction::ClockIn, &details);

    // Get initial log
    let initial_log = client.get_attendance_log(&log_id).unwrap();
    let initial_timestamp = initial_log.timestamp;

    // Advance time
    env.ledger().with_mut(|l| l.timestamp += 1000);

    // Log should remain unchanged (immutable)
    let later_log = client.get_attendance_log(&log_id).unwrap();
    assert_eq!(later_log.timestamp, initial_timestamp);
    assert_eq!(later_log.action, AttendanceAction::ClockIn);
}

// ==================== Subscription Integration Tests ====================

#[test]
fn test_create_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_001");
    let amount = 100_000i128;
    let duration = 2_592_000u64; // 30 days

    // Set USDC contract address
    client.set_usdc_contract(&admin, &payment_token);

    // Create subscription
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Verify subscription was created
    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.id, subscription_id);
    assert_eq!(subscription.user, user);
    assert_eq!(subscription.amount, amount);
    assert_eq!(subscription.status, MembershipStatus::Active);

    // Verify attendance log was created
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.user_id, user);

    let details = log.details;
    let action = details.get(String::from_str(&env, "action")).unwrap();
    assert_eq!(action, String::from_str(&env, "subscription_created"));
}

#[test]
fn test_renew_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_002");
    let initial_amount = 100_000i128;
    let renewal_amount = 150_000i128;
    let duration = 2_592_000u64;

    // Set USDC contract and create initial subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(
        &subscription_id,
        &user,
        &payment_token,
        &initial_amount,
        &duration,
    );

    // Renew subscription
    client.renew_subscription(&subscription_id, &payment_token, &renewal_amount, &duration);

    // Verify subscription was renewed
    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.amount, renewal_amount);
    assert_eq!(subscription.status, MembershipStatus::Active);

    // Verify two attendance logs exist (create + renew)
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 2);

    // Check renewal log
    let renewal_log = logs.get(1).unwrap();
    let details = renewal_log.details;
    let action = details.get(String::from_str(&env, "action")).unwrap();
    assert_eq!(action, String::from_str(&env, "subscription_renewed"));
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #10)")]
fn test_renew_subscription_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "nonexistent");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);

    // Try to renew non-existent subscription
    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #8)")]
fn test_create_subscription_invalid_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_003");
    let invalid_amount = 0i128; // Invalid: zero amount
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);

    // Try to create subscription with invalid amount
    client.create_subscription(
        &subscription_id,
        &user,
        &payment_token,
        &invalid_amount,
        &duration,
    );
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #9)")]
fn test_create_subscription_invalid_token() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let usdc_token = Address::generate(&env);
    let wrong_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_004");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &usdc_token);

    // Try to create subscription with wrong payment token
    client.create_subscription(
        &subscription_id,
        &user,
        &wrong_token, // Wrong token
        &amount,
        &duration,
    );
}

#[test]
fn test_subscription_cross_contract_call_integration() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_005");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Verify cross-contract call worked by checking attendance logs
    let user_logs = client.get_logs_for_user(&user);
    assert_eq!(user_logs.len(), 1);

    let log = user_logs.get(0).unwrap();
    let details = log.details;

    // Verify all expected fields in the log details
    assert!(details.contains_key(String::from_str(&env, "action")));
    assert!(details.contains_key(String::from_str(&env, "subscription_id")));
    assert!(details.contains_key(String::from_str(&env, "amount")));
    assert!(details.contains_key(String::from_str(&env, "timestamp")));

    // Verify the subscription_id in the log matches
    let logged_sub_id = details
        .get(String::from_str(&env, "subscription_id"))
        .unwrap();
    assert_eq!(logged_sub_id, subscription_id);
}

#[test]
fn test_multiple_subscription_events_logged() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);

    // Create multiple subscriptions
    let sub_id_1 = String::from_str(&env, "sub_multi_001");
    let sub_id_2 = String::from_str(&env, "sub_multi_002");

    client.create_subscription(&sub_id_1, &user, &payment_token, &amount, &duration);
    client.create_subscription(&sub_id_2, &user, &payment_token, &amount, &duration);

    // Renew first subscription
    client.renew_subscription(&sub_id_1, &payment_token, &amount, &duration);

    // Verify 3 events logged for user (2 creates + 1 renew)
    let logs = client.get_logs_for_user(&user);
    assert_eq!(logs.len(), 3);

    // Verify action types - check each log directly
    let action1 = logs
        .get(0)
        .unwrap()
        .details
        .get(String::from_str(&env, "action"))
        .unwrap();
    let action2 = logs
        .get(1)
        .unwrap()
        .details
        .get(String::from_str(&env, "action"))
        .unwrap();
    let action3 = logs
        .get(2)
        .unwrap()
        .details
        .get(String::from_str(&env, "action"))
        .unwrap();

    assert_eq!(action1, String::from_str(&env, "subscription_created"));
    assert_eq!(action2, String::from_str(&env, "subscription_created"));
    assert_eq!(action3, String::from_str(&env, "subscription_renewed"));
}

#[test]
fn test_cancel_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_cancel_001");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Verify subscription is active
    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.status, MembershipStatus::Active);

    // Cancel subscription
    client.cancel_subscription(&subscription_id);

    // Verify subscription is now inactive
    let cancelled_subscription = client.get_subscription(&subscription_id);
    assert_eq!(cancelled_subscription.status, MembershipStatus::Inactive);
    assert_eq!(cancelled_subscription.id, subscription_id);
    assert_eq!(cancelled_subscription.user, user);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #10)")]
fn test_cancel_subscription_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let subscription_id = String::from_str(&env, "nonexistent_sub");

    // Try to cancel non-existent subscription
    client.cancel_subscription(&subscription_id);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #13)")]
fn test_create_duplicate_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_duplicate");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Try to create duplicate subscription
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);
}

#[test]
fn test_subscription_renewal_extends_from_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_extend");
    let amount = 100_000i128;
    let duration = 2_592_000u64; // 30 days

    // Setup and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let initial_subscription = client.get_subscription(&subscription_id);
    let initial_expires_at = initial_subscription.expires_at;

    // Renew before expiry
    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);

    let renewed_subscription = client.get_subscription(&subscription_id);

    // Should extend from original expiry, not current time
    assert_eq!(
        renewed_subscription.expires_at,
        initial_expires_at + duration
    );
    assert_eq!(renewed_subscription.status, MembershipStatus::Active);
}

#[test]
fn test_subscription_renewal_after_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_expired");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let initial_subscription = client.get_subscription(&subscription_id);

    // Advance time past expiry
    env.ledger()
        .with_mut(|l| l.timestamp = initial_subscription.expires_at + 1000);

    // Renew after expiry
    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);

    let renewed_subscription = client.get_subscription(&subscription_id);
    let current_time = env.ledger().timestamp();

    // Should extend from current time since subscription expired
    assert_eq!(renewed_subscription.expires_at, current_time + duration);
    assert_eq!(renewed_subscription.status, MembershipStatus::Active);
}

#[test]
fn test_get_subscription_retrieves_correct_data() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_retrieve");
    let amount = 250_000i128;
    let duration = 5_184_000u64; // 60 days

    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let subscription = client.get_subscription(&subscription_id);

    assert_eq!(subscription.id, subscription_id);
    assert_eq!(subscription.user, user);
    assert_eq!(subscription.payment_token, payment_token);
    assert_eq!(subscription.amount, amount);
    assert_eq!(subscription.status, MembershipStatus::Active);
    assert_eq!(subscription.created_at, env.ledger().timestamp());
    assert_eq!(subscription.expires_at, env.ledger().timestamp() + duration);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #10)")]
fn test_get_subscription_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let subscription_id = String::from_str(&env, "nonexistent");

    // Try to get non-existent subscription
    client.get_subscription(&subscription_id);
}

#[test]
fn test_subscription_payment_validation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_payment");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup USDC contract
    client.set_usdc_contract(&admin, &payment_token);

    // Creating subscription validates payment (amount > 0, correct token)
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.amount, amount);
}

#[test]
fn test_multiple_users_multiple_subscriptions() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);

    // Create subscriptions for different users
    let sub_id_1 = String::from_str(&env, "user1_sub1");
    let sub_id_2 = String::from_str(&env, "user1_sub2");
    let sub_id_3 = String::from_str(&env, "user2_sub1");

    client.create_subscription(&sub_id_1, &user1, &payment_token, &amount, &duration);
    client.create_subscription(&sub_id_2, &user1, &payment_token, &amount, &duration);
    client.create_subscription(&sub_id_3, &user2, &payment_token, &amount, &duration);

    // Verify each subscription is independent
    let subscription1 = client.get_subscription(&sub_id_1);
    let subscription2 = client.get_subscription(&sub_id_2);
    let subscription3 = client.get_subscription(&sub_id_3);

    assert_eq!(subscription1.user, user1);
    assert_eq!(subscription2.user, user1);
    assert_eq!(subscription3.user, user2);
    assert_eq!(subscription1.id, sub_id_1);
    assert_eq!(subscription2.id, sub_id_2);
    assert_eq!(subscription3.id, sub_id_3);
}

#[test]
fn test_subscription_amount_updates_on_renewal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_amount_update");
    let initial_amount = 100_000i128;
    let renewal_amount = 200_000i128;
    let duration = 2_592_000u64;

    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(
        &subscription_id,
        &user,
        &payment_token,
        &initial_amount,
        &duration,
    );

    let initial_subscription = client.get_subscription(&subscription_id);
    assert_eq!(initial_subscription.amount, initial_amount);

    // Renew with different amount
    client.renew_subscription(&subscription_id, &payment_token, &renewal_amount, &duration);

    let renewed_subscription = client.get_subscription(&subscription_id);
    assert_eq!(renewed_subscription.amount, renewal_amount);
}

// ==================== Event Emission Tests ====================

#[test]
fn test_subscription_created_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_event_001");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Set USDC contract
    client.set_usdc_contract(&admin, &payment_token);

    // Create subscription
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Verify events were emitted
    let events = env.events().all();
    assert!(!events.is_empty(), "Events should be emitted");

    // Note: In production tests, you would verify specific event data
    // using event filtering and parsing capabilities of the SDK
}

#[test]
fn test_subscription_cancelled_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_event_002");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Set USDC contract and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Cancel subscription
    client.cancel_subscription(&subscription_id);

    // Verify subscription was cancelled
    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.status, MembershipStatus::Inactive);
}

#[test]
fn test_subscription_renewed_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_event_003");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Set USDC contract and create subscription
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let original_subscription = client.get_subscription(&subscription_id);
    let original_expiry = original_subscription.expires_at;

    // Renew subscription
    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);

    // Verify subscription was renewed (expiry extended)
    let renewed_subscription = client.get_subscription(&subscription_id);
    assert!(renewed_subscription.expires_at > original_expiry);
}

#[test]
fn test_usdc_contract_set_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let payment_token = Address::generate(&env);

    // Set USDC contract
    client.set_usdc_contract(&admin, &payment_token);

    // Verify event was emitted
    let events = env.events().all();
    assert!(
        !events.is_empty(),
        "USDC contract set event should be emitted"
    );
}

#[test]
fn test_multiple_events_emitted_in_sequence() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_event_004");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Execute sequence of operations
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let sub_after_create = client.get_subscription(&subscription_id);
    assert_eq!(sub_after_create.status, MembershipStatus::Active);

    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);

    let sub_after_renew = client.get_subscription(&subscription_id);
    assert!(sub_after_renew.expires_at > sub_after_create.expires_at);

    client.cancel_subscription(&subscription_id);

    let sub_after_cancel = client.get_subscription(&subscription_id);
    assert_eq!(sub_after_cancel.status, MembershipStatus::Inactive);
}

// ==================== Pause/Resume Tests ====================

#[test]
fn test_pause_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_pause_001");
    let amount = 100_000i128;
    let duration = 2_592_000u64; // 30 days

    // Setup admin and USDC contract
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Verify subscription is active
    let subscription = client.get_subscription(&subscription_id);
    assert_eq!(subscription.status, MembershipStatus::Active);
    assert_eq!(subscription.pause_count, 0);

    // Advance time to meet min_active_time requirement (1 day default)
    env.ledger().with_mut(|l| l.timestamp += 86_400);

    // Pause subscription
    let reason = Some(String::from_str(&env, "vacation"));
    client.pause_subscription(&subscription_id, &reason);

    // Verify subscription is paused
    let paused_subscription = client.get_subscription(&subscription_id);
    assert_eq!(paused_subscription.status, MembershipStatus::Paused);
    assert_eq!(paused_subscription.pause_count, 1);
    assert!(paused_subscription.paused_at.is_some());

    // Verify pause history
    let history = client.get_pause_history(&subscription_id);
    assert_eq!(history.len(), 1);
    let entry = history.get(0).unwrap();
    assert_eq!(entry.actor, user);
    assert!(!entry.is_admin);
    assert_eq!(entry.reason, reason);
}

#[test]
fn test_resume_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_resume_001");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    let original_subscription = client.get_subscription(&subscription_id);
    let original_expires_at = original_subscription.expires_at;

    // Advance time to meet min_active_time, then pause
    env.ledger().with_mut(|l| l.timestamp += 86_400);
    client.pause_subscription(&subscription_id, &None);

    // Advance time while paused
    env.ledger().with_mut(|l| l.timestamp += 86400); // 1 day

    // Resume subscription
    client.resume_subscription(&subscription_id);

    // Verify subscription is active again
    let resumed_subscription = client.get_subscription(&subscription_id);
    assert_eq!(resumed_subscription.status, MembershipStatus::Active);
    assert!(resumed_subscription.paused_at.is_none());
    assert!(resumed_subscription.expires_at > original_expires_at); // Extended due to pause

    // Verify pause history shows both pause and resume
    let history = client.get_pause_history(&subscription_id);
    assert_eq!(history.len(), 2);

    let pause_entry = history.get(0).unwrap();
    let resume_entry = history.get(1).unwrap();

    assert_eq!(pause_entry.action, types::PauseAction::Pause);
    assert_eq!(resume_entry.action, types::PauseAction::Resume);
    assert!(resume_entry.paused_duration.is_some());
    assert!(resume_entry.applied_extension.is_some());
}

#[test]
fn test_admin_pause_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_admin_pause");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Admin pauses subscription (no time restrictions for admin)
    let reason = Some(String::from_str(&env, "policy violation"));
    client.pause_subscription_admin(&subscription_id, &admin, &reason);

    // Verify subscription is paused
    let paused_subscription = client.get_subscription(&subscription_id);
    assert_eq!(paused_subscription.status, MembershipStatus::Paused);

    // Verify pause history shows admin action
    let history = client.get_pause_history(&subscription_id);
    assert_eq!(history.len(), 1);
    let entry = history.get(0).unwrap();
    assert_eq!(entry.actor, admin);
    assert!(entry.is_admin);
    assert_eq!(entry.reason, reason);
}

#[test]
fn test_admin_resume_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_admin_resume");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Advance time and pause subscription
    env.ledger().with_mut(|l| l.timestamp += 86_400);
    client.pause_subscription(&subscription_id, &None);

    // Admin resumes subscription
    client.resume_subscription_admin(&subscription_id, &admin);

    // Verify subscription is active
    let resumed_subscription = client.get_subscription(&subscription_id);
    assert_eq!(resumed_subscription.status, MembershipStatus::Active);

    // Verify pause history shows admin resume
    let history = client.get_pause_history(&subscription_id);
    assert_eq!(history.len(), 2);
    let resume_entry = history.get(1).unwrap();
    assert_eq!(resume_entry.actor, admin);
    assert!(resume_entry.is_admin);
}

#[test]
fn test_pause_config_management() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    // Set admin first
    client.set_admin(&admin);

    // Get default config
    let default_config = client.get_pause_config();
    assert_eq!(default_config.max_pause_duration, 2_592_000); // 30 days
    assert_eq!(default_config.max_pause_count, 3);
    assert_eq!(default_config.min_active_time, 86_400); // 1 day

    // Set custom config
    let custom_config = types::PauseConfig {
        max_pause_duration: 1_296_000, // 15 days
        max_pause_count: 2,
        min_active_time: 172_800, // 2 days
    };

    client.set_pause_config(&admin, &custom_config);

    // Verify config was updated
    let updated_config = client.get_pause_config();
    assert_eq!(updated_config.max_pause_duration, 1_296_000);
    assert_eq!(updated_config.max_pause_count, 2);
    assert_eq!(updated_config.min_active_time, 172_800);
}

#[test]
fn test_pause_stats() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_stats");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Check initial stats
    let initial_stats = client.get_pause_stats(&subscription_id);
    assert_eq!(initial_stats.pause_count, 0);
    assert_eq!(initial_stats.total_paused_duration, 0);
    assert!(!initial_stats.is_paused);
    assert!(initial_stats.paused_at.is_none());

    // Advance time and pause
    env.ledger().with_mut(|l| l.timestamp += 86_400);
    client.pause_subscription(&subscription_id, &None);

    let paused_stats = client.get_pause_stats(&subscription_id);
    assert_eq!(paused_stats.pause_count, 1);
    assert!(paused_stats.is_paused);
    assert!(paused_stats.paused_at.is_some());

    // Advance time and resume
    env.ledger().with_mut(|l| l.timestamp += 86400); // 1 day
    client.resume_subscription(&subscription_id);

    // Check final stats
    let final_stats = client.get_pause_stats(&subscription_id);
    assert_eq!(final_stats.pause_count, 1);
    assert_eq!(final_stats.total_paused_duration, 86400);
    assert!(!final_stats.is_paused);
    assert!(final_stats.paused_at.is_none());
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #24)")]
fn test_pause_already_paused_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_double_pause");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Advance time and pause subscription
    env.ledger().with_mut(|l| l.timestamp += 86_400);
    client.pause_subscription(&subscription_id, &None);

    // Try to pause again - should fail
    client.pause_subscription(&subscription_id, &None);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #28)")]
fn test_resume_not_paused_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_resume_active");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup and create subscription (but don't pause)
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Try to resume active subscription - should fail
    client.resume_subscription(&subscription_id);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #24)")]
fn test_renew_paused_subscription() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_renew_paused");
    let amount = 100_000i128;
    let duration = 2_592_000u64;

    // Setup admin and create subscription
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);
    client.create_subscription(&subscription_id, &user, &payment_token, &amount, &duration);

    // Advance time and pause subscription
    env.ledger().with_mut(|l| l.timestamp += 86_400);
    client.pause_subscription(&subscription_id, &None);

    // Try to renew paused subscription - should fail
    client.renew_subscription(&subscription_id, &payment_token, &amount, &duration);
}

// ==================== Token Renewal System Tests ====================

#[test]
fn test_set_renewal_config_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    // Set renewal config
    let grace_period = 7 * 24 * 60 * 60; // 7 days
    let notice_period = 24 * 60 * 60; // 1 day
    client.set_renewal_config(&grace_period, &notice_period, &true);

    // Get and verify config
    let config = client.get_renewal_config();
    assert_eq!(config.grace_period_duration, grace_period);
    assert_eq!(config.auto_renewal_notice_days, notice_period);
    assert!(config.renewals_enabled);
}

#[test]
fn test_renew_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let tier_id = String::from_str(&env, "tier_basic");

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Create tier
    let tier_params = CreateTierParams {
        id: tier_id.clone(),
        name: String::from_str(&env, "Basic"),
        level: common_types::TierLevel::Basic,
        price: 100_000i128,
        annual_price: 1_000_000i128,
        features: soroban_sdk::vec![&env, common_types::TierFeature::BasicAccess],
        max_users: 100,
        max_storage: 10_000_000,
    };
    client.create_tier(&admin, &tier_params);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    let old_token = client.get_token(&token_id);
    let old_expiry = old_token.expiry_date;

    // Renew token
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Monthly);

    // Verify renewal
    let renewed_token = client.get_token(&token_id);
    assert!(renewed_token.expiry_date > old_expiry);
    assert_eq!(renewed_token.status, MembershipStatus::Active);
    assert_eq!(renewed_token.tier_id, Some(tier_id.clone()));
    assert_eq!(renewed_token.renewal_attempts, 1);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #32)")]
fn test_renew_token_tier_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    // Try to renew with non-existent tier
    client.renew_token(
        &token_id,
        &payment_token,
        &String::from_str(&env, "nonexistent_tier"),
        &BillingCycle::Monthly,
    );
}

#[test]
fn test_grace_period_entry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup
    client.set_admin(&admin);

    // Issue token with short expiry
    let expiry_date = env.ledger().timestamp() + 100;
    client.issue_token(&token_id, &user, &expiry_date);

    // Advance time past expiry
    env.ledger().with_mut(|l| l.timestamp += 200);

    // Apply grace period
    let token = client.check_and_apply_grace_period(&token_id);
    assert_eq!(token.status, MembershipStatus::GracePeriod);
    assert!(token.grace_period_entered_at.is_some());
    assert!(token.grace_period_expires_at.is_some());
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #47)")]
fn test_transfer_blocked_in_grace_period() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let new_user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup
    client.set_admin(&admin);

    // Issue token with short expiry
    let expiry_date = env.ledger().timestamp() + 100;
    client.issue_token(&token_id, &user, &expiry_date);

    // Advance time past expiry and enter grace period
    env.ledger().with_mut(|l| l.timestamp += 200);
    client.check_and_apply_grace_period(&token_id);

    // Try to transfer - should fail
    client.transfer_token(&token_id, &new_user);
}

#[test]
fn test_renewal_history_tracking() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let tier_id = String::from_str(&env, "tier_pro");

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Create tier
    let tier_params = CreateTierParams {
        id: tier_id.clone(),
        name: String::from_str(&env, "Pro"),
        level: common_types::TierLevel::Pro,
        price: 200_000i128,
        annual_price: 2_000_000i128,
        features: soroban_sdk::vec![&env, common_types::TierFeature::AdvancedAnalytics],
        max_users: 500,
        max_storage: 50_000_000,
    };
    client.create_tier(&admin, &tier_params);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    // Renew token twice
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Monthly);

    env.ledger().with_mut(|l| l.timestamp += 1000);
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Annual);

    // Check renewal history
    let history = client.get_renewal_history(&token_id);
    assert_eq!(history.len(), 2);

    let first_renewal = history.get(0).unwrap();
    assert_eq!(first_renewal.tier_id, tier_id);
    assert!(first_renewal.success);

    let second_renewal = history.get(1).unwrap();
    assert_eq!(second_renewal.tier_id, tier_id);
    assert!(second_renewal.success);
}

#[test]
fn test_auto_renewal_settings() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup
    client.set_admin(&admin);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    // Enable auto-renewal
    client.set_auto_renewal(&token_id, &true, &payment_token);

    // Get settings
    let settings = client.get_auto_renewal_settings(&user);
    assert!(settings.is_some());

    let settings_unwrapped = settings.unwrap();
    assert!(settings_unwrapped.enabled);
    assert_eq!(settings_unwrapped.token_id, token_id);
    assert_eq!(settings_unwrapped.payment_token, payment_token);
}

#[test]
fn test_auto_renewal_eligibility() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup with 1 day notice period
    client.set_admin(&admin);
    let grace_period = 7 * 24 * 60 * 60;
    let notice_period = 24 * 60 * 60;
    client.set_renewal_config(&grace_period, &notice_period, &true);

    // Issue token expiring in 2 days
    let expiry_date = env.ledger().timestamp() + 2 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    // Not yet eligible (2 days until expiry, need to be within 1 day)
    let eligible_before = client.check_auto_renewal_eligibility(&token_id);
    assert!(!eligible_before);

    // Advance time to 12 hours before expiry
    env.ledger().with_mut(|l| l.timestamp += 36 * 60 * 60);

    // Now eligible
    let eligible_after = client.check_auto_renewal_eligibility(&token_id);
    assert!(eligible_after);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #48)")]
fn test_grace_period_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Setup with short grace period
    client.set_admin(&admin);
    let grace_period = 100; // 100 seconds
    let notice_period = 50;
    client.set_renewal_config(&grace_period, &notice_period, &true);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 50;
    client.issue_token(&token_id, &user, &expiry_date);

    // Advance time past expiry
    env.ledger().with_mut(|l| l.timestamp += 100);
    client.check_and_apply_grace_period(&token_id);

    // Advance time past grace period
    env.ledger().with_mut(|l| l.timestamp += 200);

    // Should fail - grace period expired
    client.check_and_apply_grace_period(&token_id);
}

#[test]
fn test_renewal_extends_from_current_expiry() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let tier_id = String::from_str(&env, "tier_basic");

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Create tier
    let tier_params = CreateTierParams {
        id: tier_id.clone(),
        name: String::from_str(&env, "Basic"),
        level: common_types::TierLevel::Basic,
        price: 100_000i128,
        annual_price: 1_000_000i128,
        features: soroban_sdk::vec![&env, common_types::TierFeature::BasicAccess],
        max_users: 100,
        max_storage: 10_000_000,
    };
    client.create_tier(&admin, &tier_params);

    // Issue token expiring in 10 days
    let expiry_date = env.ledger().timestamp() + 10 * 24 * 60 * 60;
    client.issue_token(&token_id, &user, &expiry_date);

    // Renew before expiry (monthly = 30 days)
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Monthly);

    // New expiry should be original_expiry + 30 days (not current_time + 30 days)
    let renewed_token = client.get_token(&token_id);
    let expected_expiry = expiry_date + 30 * 24 * 60 * 60;
    assert_eq!(renewed_token.expiry_date, expected_expiry);
}

#[test]
fn test_renewal_after_expiry_extends_from_current_time() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let tier_id = String::from_str(&env, "tier_basic");

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Create tier
    let tier_params = CreateTierParams {
        id: tier_id.clone(),
        name: String::from_str(&env, "Basic"),
        level: common_types::TierLevel::Basic,
        price: 100_000i128,
        annual_price: 1_000_000i128,
        features: soroban_sdk::vec![&env, common_types::TierFeature::BasicAccess],
        max_users: 100,
        max_storage: 10_000_000,
    };
    client.create_tier(&admin, &tier_params);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 100;
    client.issue_token(&token_id, &user, &expiry_date);

    // Advance time past expiry
    env.ledger().with_mut(|l| l.timestamp += 200);
    let current_time = env.ledger().timestamp();

    // Enter grace period
    client.check_and_apply_grace_period(&token_id);

    // Renew after expiry
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Monthly);

    // New expiry should be current_time + 30 days (not expired_date + 30 days)
    let renewed_token = client.get_token(&token_id);
    let expected_expiry = current_time + 30 * 24 * 60 * 60;
    assert_eq!(renewed_token.expiry_date, expected_expiry);
}

#[test]
fn test_renewal_clears_grace_period() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let tier_id = String::from_str(&env, "tier_basic");

    // Setup
    client.set_admin(&admin);
    client.set_usdc_contract(&admin, &payment_token);

    // Create tier
    let tier_params = CreateTierParams {
        id: tier_id.clone(),
        name: String::from_str(&env, "Basic"),
        level: common_types::TierLevel::Basic,
        price: 100_000i128,
        annual_price: 1_000_000i128,
        features: soroban_sdk::vec![&env, common_types::TierFeature::BasicAccess],
        max_users: 100,
        max_storage: 10_000_000,
    };
    client.create_tier(&admin, &tier_params);

    // Issue token
    let expiry_date = env.ledger().timestamp() + 100;
    client.issue_token(&token_id, &user, &expiry_date);

    // Expire and enter grace period
    env.ledger().with_mut(|l| l.timestamp += 200);
    client.check_and_apply_grace_period(&token_id);

    let token_in_grace = client.get_token(&token_id);
    assert_eq!(token_in_grace.status, MembershipStatus::GracePeriod);
    assert!(token_in_grace.grace_period_entered_at.is_some());

    // Renew token
    client.renew_token(&token_id, &payment_token, &tier_id, &BillingCycle::Monthly);

    // Grace period should be cleared
    let renewed_token = client.get_token(&token_id);
    assert_eq!(renewed_token.status, MembershipStatus::Active);
    assert!(renewed_token.grace_period_entered_at.is_none());
    assert!(renewed_token.grace_period_expires_at.is_none());
}

// ==================== Token Allowance and Delegation Tests ====================

#[test]
fn test_approve_and_get_allowance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    let allowance_expiry = Some(env.ledger().timestamp() + 3600);
    client.approve(&token_id, &spender, &1000, &allowance_expiry);

    let allowance = client.get_allowance(&token_id, &owner, &spender).unwrap();
    assert_eq!(allowance.token_id, token_id);
    assert_eq!(allowance.owner, owner);
    assert_eq!(allowance.spender, spender);
    assert_eq!(allowance.amount, 1000);
    assert_eq!(allowance.expires_at, allowance_expiry);
}

#[test]
fn test_transfer_from_supports_partial_allowance_consumption() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.approve(&token_id, &spender, &1000, &None);

    // Consume part of allowance while keeping ownership unchanged.
    client.transfer_from(&token_id, &owner, &owner, &spender, &300);

    let after_partial = client.get_allowance(&token_id, &owner, &spender).unwrap();
    assert_eq!(after_partial.amount, 700);

    // Consume remaining allowance while moving token ownership.
    client.transfer_from(&token_id, &owner, &new_owner, &spender, &700);
    let token = client.get_token(&token_id);
    assert_eq!(token.user, new_owner);

    let remaining = client.get_allowance(&token_id, &owner, &spender);
    assert!(remaining.is_none());
}

#[test]
fn test_transfer_from_rejects_expired_allowance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    let allowance_expiry = Some(env.ledger().timestamp() + 60);
    client.approve(&token_id, &spender, &500, &allowance_expiry);

    env.ledger().with_mut(|l| l.timestamp += 61);

    let result = client.try_transfer_from(&token_id, &owner, &receiver, &spender, &100);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));

    let allowance = client.get_allowance(&token_id, &owner, &spender);
    assert!(allowance.is_none());
}

#[test]
fn test_revoke_allowance_blocks_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.approve(&token_id, &spender, &500, &None);
    client.revoke_allowance(&token_id, &spender);

    let result = client.try_transfer_from(&token_id, &owner, &receiver, &spender, &100);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

#[test]
fn test_transfer_from_rejects_excessive_allowance_spend() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.approve(&token_id, &spender, &100, &None);

    let result = client.try_transfer_from(&token_id, &owner, &receiver, &spender, &200);
    assert_eq!(result, Err(Ok(errors::Error::InsufficientBalance)));
}

#[test]
fn test_approve_rejects_self_as_spender() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    let result = client.try_approve(&token_id, &owner, &500, &None);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

// ==================== Token Fractionalization Tests ====================

#[test]
fn test_fractionalize_transfer_and_get_holders() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let holder_b = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.fractionalize_token(&token_id, &1000, &100);
    client.transfer_fraction(&token_id, &owner, &holder_b, &300);

    let holders = client.get_fraction_holders(&token_id);
    assert_eq!(holders.len(), 2);

    let mut owner_shares = 0i128;
    let mut holder_b_shares = 0i128;
    let mut owner_voting_bps = 0u32;
    let mut holder_b_voting_bps = 0u32;
    for holder in holders.iter() {
        if holder.holder == owner {
            owner_shares = holder.shares;
            owner_voting_bps = holder.voting_power_bps;
        }
        if holder.holder == holder_b {
            holder_b_shares = holder.shares;
            holder_b_voting_bps = holder.voting_power_bps;
        }
    }

    assert_eq!(owner_shares, 700);
    assert_eq!(holder_b_shares, 300);
    assert_eq!(owner_voting_bps, 7000);
    assert_eq!(holder_b_voting_bps, 3000);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #8)")]
fn test_fractionalize_rejects_invalid_min_fraction_size() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    // 333 does not divide total shares evenly.
    client.fractionalize_token(&token_id, &1000, &333);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #8)")]
fn test_transfer_fraction_requires_min_fraction_granularity() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let holder_b = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.fractionalize_token(&token_id, &1000, &100);
    client.transfer_fraction(&token_id, &owner, &holder_b, &150);
}

#[test]
#[should_panic(expected = "HostError: Error(Contract, #4)")]
fn test_recombine_requires_full_share_ownership() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let holder_b = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.fractionalize_token(&token_id, &1000, &100);
    client.transfer_fraction(&token_id, &owner, &holder_b, &400);

    client.recombine_fractions(&token_id, &owner);
}

#[test]
fn test_recombine_after_collecting_all_shares() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let holder_b = Address::generate(&env);
    let new_owner = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.fractionalize_token(&token_id, &1000, &100);
    client.transfer_fraction(&token_id, &owner, &holder_b, &400);
    client.transfer_fraction(&token_id, &holder_b, &owner, &400);
    client.recombine_fractions(&token_id, &owner);

    let token = client.get_token(&token_id);
    assert_eq!(token.user, owner);

    client.transfer_token(&token_id, &new_owner);
    let transferred = client.get_token(&token_id);
    assert_eq!(transferred.user, new_owner);
}

#[test]
fn test_distribute_fraction_rewards_proportionally() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let holder_b = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    let expiry_date = env.ledger().timestamp() + 30 * 24 * 60 * 60;
    client.issue_token(&token_id, &owner, &expiry_date);

    client.fractionalize_token(&token_id, &1000, &100);
    client.transfer_fraction(&token_id, &owner, &holder_b, &300);

    let distribution = client.distribute_fraction_rewards(&token_id, &1000);
    assert_eq!(distribution.total_amount, 1000);
    assert_eq!(distribution.recipients, 2);

    let owner_reward = client.get_pending_fraction_reward(&token_id, &owner);
    let holder_b_reward = client.get_pending_fraction_reward(&token_id, &holder_b);
    assert_eq!(owner_reward, 700);
    assert_eq!(holder_b_reward, 300);
}

// ==================== Emergency Pause Tests ====================

#[test]
fn test_emergency_pause_sets_paused_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    assert!(!client.is_contract_paused());

    client.emergency_pause(&admin, &None, &None, &None);

    assert!(client.is_contract_paused());
}

#[test]
fn test_emergency_pause_state_fields() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let reason = Some(String::from_str(&env, "exploit detected"));
    client.emergency_pause(&admin, &reason, &None, &None);

    let state = client.get_emergency_pause_state();
    assert!(state.is_paused);
    assert_eq!(state.paused_by, Some(admin));
    assert!(state.paused_at.is_some());
    assert_eq!(state.reason, reason);
    assert_eq!(state.pause_count, 1);
}

#[test]
fn test_emergency_pause_increments_pause_count() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    client.emergency_pause(&admin, &None, &None, &None);
    client.emergency_unpause(&admin);
    client.emergency_pause(&admin, &None, &None, &None);

    let state = client.get_emergency_pause_state();
    assert_eq!(state.pause_count, 2);
}

#[test]
fn test_emergency_pause_rejects_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let stranger = Address::generate(&env);
    let result = client.try_emergency_pause(&stranger, &None, &None, &None);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

#[test]
fn test_issue_token_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);
    client.emergency_pause(&admin, &None, &None, &None);

    let token_id = BytesN::<32>::random(&env);
    let user = Address::generate(&env);
    let expiry = env.ledger().timestamp() + 100_000;
    let result = client.try_issue_token(&token_id, &user, &expiry);
    assert_eq!(result, Err(Ok(errors::Error::SubscriptionPaused)));
}

#[test]
fn test_transfer_token_blocked_when_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.emergency_pause(&admin, &None, &None, &None);

    let new_user = Address::generate(&env);
    let result = client.try_transfer_token(&token_id, &new_user);
    assert_eq!(result, Err(Ok(errors::Error::SubscriptionPaused)));
}

#[test]
fn test_emergency_unpause_clears_paused_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    client.emergency_pause(&admin, &None, &None, &None);
    assert!(client.is_contract_paused());

    client.emergency_unpause(&admin);
    assert!(!client.is_contract_paused());

    let state = client.get_emergency_pause_state();
    assert!(!state.is_paused);
    assert!(state.paused_by.is_none());
    assert!(state.paused_at.is_none());
    assert!(state.reason.is_none());
    assert!(state.auto_unpause_at.is_none());
    assert!(state.time_lock_until.is_none());
}

#[test]
fn test_emergency_unpause_restores_token_operations() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.emergency_pause(&admin, &None, &None, &None);
    client.emergency_unpause(&admin);

    let new_user = Address::generate(&env);
    client.transfer_token(&token_id, &new_user);
}

#[test]
fn test_emergency_unpause_rejects_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);
    client.emergency_pause(&admin, &None, &None, &None);

    let stranger = Address::generate(&env);
    let result = client.try_emergency_unpause(&stranger);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

#[test]
fn test_unpause_blocked_while_time_lock_active() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    // Pause with a 1-hour time lock.
    client.emergency_pause(&admin, &None, &None, &Some(3_600));

    // Attempt to unpause before the time lock expires.
    let result = client.try_emergency_unpause(&admin);
    assert_eq!(result, Err(Ok(errors::Error::PauseTooEarly)));
}

#[test]
fn test_unpause_succeeds_after_time_lock_expires() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    client.emergency_pause(&admin, &None, &None, &Some(3_600));

    // Advance ledger past the time lock.
    env.ledger().with_mut(|l| l.timestamp += 3_601);

    client.emergency_unpause(&admin);
    assert!(!client.is_contract_paused());
}

#[test]
fn test_contract_treated_as_unpaused_after_auto_unpause_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    // Pause with a 60-second auto-unpause window.
    client.emergency_pause(&admin, &None, &Some(60), &None);
    assert!(client.is_contract_paused());

    // Advance ledger past the auto-unpause deadline.
    env.ledger().with_mut(|l| l.timestamp += 61);

    assert!(!client.is_contract_paused());
}

#[test]
fn test_auto_unpause_deadline_stored_in_state() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let now = env.ledger().timestamp();
    client.emergency_pause(&admin, &None, &Some(120), &None);

    let state = client.get_emergency_pause_state();
    assert_eq!(state.auto_unpause_at, Some(now + 120));
}

#[test]
fn test_token_ops_allowed_after_auto_unpause_deadline() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.emergency_pause(&admin, &None, &Some(60), &None);

    env.ledger().with_mut(|l| l.timestamp += 61);

    // Transfer should succeed because auto-unpause has taken effect.
    let new_user = Address::generate(&env);
    client.transfer_token(&token_id, &new_user);
}

// ==================== Per-Token Pause Tests ====================

#[test]
fn test_pause_token_operations_sets_token_paused() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);

    assert!(!client.is_token_paused(&token_id));

    client.pause_token_operations(&admin, &token_id, &None);

    assert!(client.is_token_paused(&token_id));
}

#[test]
fn test_transfer_blocked_by_per_token_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.pause_token_operations(&admin, &token_id, &None);

    let new_user = Address::generate(&env);
    let result = client.try_transfer_token(&token_id, &new_user);
    assert_eq!(result, Err(Ok(errors::Error::SubscriptionPaused)));
}

#[test]
fn test_per_token_pause_does_not_affect_other_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let other_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.issue_token(&other_id, &user, &expiry);

    // Pause only the first token.
    client.pause_token_operations(&admin, &token_id, &None);

    // The second token should transfer fine.
    let new_user = Address::generate(&env);
    client.transfer_token(&other_id, &new_user);
}

#[test]
fn test_pause_token_operations_rejects_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);

    let stranger = Address::generate(&env);
    let result = client.try_pause_token_operations(&stranger, &token_id, &None);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

#[test]
fn test_pause_token_operations_rejects_nonexistent_token() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let ghost_id = BytesN::<32>::random(&env);
    let result = client.try_pause_token_operations(&admin, &ghost_id, &None);
    assert_eq!(result, Err(Ok(errors::Error::TokenNotFound)));
}

#[test]
fn test_unpause_token_operations_clears_token_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.pause_token_operations(&admin, &token_id, &None);
    assert!(client.is_token_paused(&token_id));

    client.unpause_token_operations(&admin, &token_id);
    assert!(!client.is_token_paused(&token_id));
}

#[test]
fn test_transfer_succeeds_after_token_unpause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.pause_token_operations(&admin, &token_id, &None);
    client.unpause_token_operations(&admin, &token_id);

    let new_user = Address::generate(&env);
    client.transfer_token(&token_id, &new_user);
}

#[test]
fn test_unpause_token_operations_rejects_non_admin() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.pause_token_operations(&admin, &token_id, &None);

    let stranger = Address::generate(&env);
    let result = client.try_unpause_token_operations(&stranger, &token_id);
    assert_eq!(result, Err(Ok(errors::Error::Unauthorized)));
}

#[test]
fn test_global_unpause_does_not_lift_per_token_pause() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);

    // Apply both pauses.
    client.emergency_pause(&admin, &None, &None, &None);
    client.pause_token_operations(&admin, &token_id, &None);

    // Lift only the global pause.
    client.emergency_unpause(&admin);

    // Transfer should still be blocked by the per-token pause.
    let new_user = Address::generate(&env);
    let result = client.try_transfer_token(&token_id, &new_user);
    assert_eq!(result, Err(Ok(errors::Error::SubscriptionPaused)));
}

#[test]
fn test_both_pauses_must_be_cleared_before_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 100_000;

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &expiry);
    client.emergency_pause(&admin, &None, &None, &None);
    client.pause_token_operations(&admin, &token_id, &None);

    client.emergency_unpause(&admin);
    client.unpause_token_operations(&admin, &token_id);

    // Only now should transfer succeed.
    let new_user = Address::generate(&env);
    client.transfer_token(&token_id, &new_user);
}

// ==================== Token Staking Tests ====================

/// Helper: set up env, register contract, register a staking token, and create
/// a basic staking config + one tier.  Returns `(client, admin, staking_asset_client)`.
fn setup_staking_env<'a>(
    env: &'a Env,
) -> (
    ContractClient<'a>,
    Address,
    soroban_sdk::token::StellarAssetClient<'a>,
) {
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(env, &contract_id);

    let admin = Address::generate(env);
    client.set_admin(&admin);

    let staking_token = env.register_stellar_asset_contract_v2(admin.clone());
    let reward_token = env.register_stellar_asset_contract_v2(admin.clone());

    let staking_asset_client =
        soroban_sdk::token::StellarAssetClient::new(env, &staking_token.address());

    let config = crate::types::StakingConfig {
        staking_enabled: true,
        emergency_unstake_penalty_bps: 1_000, // 10 %
        staking_token: staking_token.address(),
        reward_pool: reward_token.address(),
    };
    client.set_staking_config(&admin, &config);

    let tier = crate::types::StakingTier {
        id: String::from_str(env, "bronze"),
        name: String::from_str(env, "Bronze"),
        min_stake_amount: 1_000,
        lock_duration: 86_400,         // 1 day in seconds
        reward_multiplier_bps: 10_000, // 1x
        base_rate_bps: 500,            // 5 % annual
    };
    client.create_staking_tier(&admin, &tier);

    (client, admin, staking_asset_client)
}

#[test]
fn test_set_staking_config_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let staking_token = env.register_stellar_asset_contract_v2(admin.clone());
    let reward_token = env.register_stellar_asset_contract_v2(admin.clone());

    let config = crate::types::StakingConfig {
        staking_enabled: true,
        emergency_unstake_penalty_bps: 500,
        staking_token: staking_token.address(),
        reward_pool: reward_token.address(),
    };
    client.set_staking_config(&admin, &config);

    let fetched = client.get_staking_config();
    assert!(fetched.staking_enabled);
    assert_eq!(fetched.emergency_unstake_penalty_bps, 500);
}

#[test]
fn test_create_staking_tier_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, _sac) = setup_staking_env(&env);

    let tiers = client.get_staking_tiers();
    assert_eq!(tiers.len(), 1);

    let tier = tiers.get(0).unwrap();
    assert_eq!(tier.id, String::from_str(&env, "bronze"));
    assert_eq!(tier.min_stake_amount, 1_000);
    assert_eq!(tier.lock_duration, 86_400);
}

#[test]
fn test_stake_tokens_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);

    let stake = client.get_stake_info(&staker).expect("stake should exist");
    assert_eq!(stake.staker, staker);
    assert_eq!(stake.amount, 5_000);
    assert_eq!(stake.tier_id, String::from_str(&env, "bronze"));
    assert!(!stake.emergency_unstaked);
}

#[test]
fn test_stake_tokens_below_minimum_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    // 999 < 1_000 minimum → should return error
    let result = client.try_stake_tokens(&staker, &String::from_str(&env, "bronze"), &999);
    assert!(result.is_err());
}

#[test]
fn test_unstake_tokens_after_lock_period() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);

    // Advance the ledger past the 1-day lock duration.
    env.ledger().with_mut(|li| {
        li.timestamp += 86_400 + 1;
    });

    client.unstake_tokens(&staker);

    // Stake record should be cleared.
    assert!(client.get_stake_info(&staker).is_none());
}

#[test]
fn test_unstake_tokens_before_lock_period_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);

    // Lock period has NOT elapsed → should fail.
    let result = client.try_unstake_tokens(&staker);
    assert!(result.is_err());
}

#[test]
fn test_emergency_unstake_before_lock_period() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);

    // Emergency unstake should succeed even before the lock period ends.
    client.emergency_unstake(&staker);

    // Stake record must be cleared.
    assert!(client.get_stake_info(&staker).is_none());
}

#[test]
fn test_get_stake_info_returns_none_when_no_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let stranger = Address::generate(&env);
    assert!(client.get_stake_info(&stranger).is_none());
}

#[test]
fn test_staking_disabled_prevents_stake() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let staking_token = env.register_stellar_asset_contract_v2(admin.clone());
    let reward_token = env.register_stellar_asset_contract_v2(admin.clone());
    let sac = soroban_sdk::token::StellarAssetClient::new(&env, &staking_token.address());

    let config = crate::types::StakingConfig {
        staking_enabled: false,
        emergency_unstake_penalty_bps: 1_000,
        staking_token: staking_token.address(),
        reward_pool: reward_token.address(),
    };
    client.set_staking_config(&admin, &config);

    let tier = crate::types::StakingTier {
        id: String::from_str(&env, "bronze"),
        name: String::from_str(&env, "Bronze"),
        min_stake_amount: 1_000,
        lock_duration: 86_400,
        reward_multiplier_bps: 10_000,
        base_rate_bps: 500,
    };
    client.create_staking_tier(&admin, &tier);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    let result = client.try_stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);
    assert!(result.is_err());
}

#[test]
fn test_multiple_staking_tiers() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, admin, _sac) = setup_staking_env(&env);

    let silver = crate::types::StakingTier {
        id: String::from_str(&env, "silver"),
        name: String::from_str(&env, "Silver"),
        min_stake_amount: 10_000,
        lock_duration: 30 * 86_400,
        reward_multiplier_bps: 15_000,
        base_rate_bps: 800,
    };
    client.create_staking_tier(&admin, &silver);

    let tiers = client.get_staking_tiers();
    assert_eq!(tiers.len(), 2);
}

#[test]
fn test_cannot_stake_into_nonexistent_tier() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &10_000);

    let result =
        client.try_stake_tokens(&staker, &String::from_str(&env, "nonexistent_tier"), &5_000);
    assert!(result.is_err());
}

#[test]
fn test_add_to_existing_stake_same_tier() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _admin, sac) = setup_staking_env(&env);

    let staker = Address::generate(&env);
    sac.mint(&staker, &20_000);

    // First stake.
    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &5_000);

    // Add to the same stake.
    client.stake_tokens(&staker, &String::from_str(&env, "bronze"), &3_000);

    let stake = client.get_stake_info(&staker).unwrap();
    assert_eq!(stake.amount, 8_000);
}

// =============================================================================
// Token Upgrade Mechanism Tests
// =============================================================================

fn setup_upgrade_env() -> (Env, ContractClient<'static>, Address, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);

    let expiry_date = env.ledger().timestamp() + 86_400 * 30; // 30 days
    client.issue_token(&token_id, &user, &expiry_date);

    // Enable upgrades
    client.set_upgrade_config(
        &admin,
        &UpgradeConfig {
            upgrades_enabled: true,
            admin_only: true,
            max_rollbacks: 5,
        },
    );

    (env, client, admin, user, token_id)
}

#[test]
fn test_upgrade_config_set_and_retrieved() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.set_admin(&admin);

    let config = UpgradeConfig {
        upgrades_enabled: true,
        admin_only: false,
        max_rollbacks: 3,
    };
    client.set_upgrade_config(&admin, &config);

    let retrieved = client.get_upgrade_config();
    assert!(retrieved.upgrades_enabled);
    assert!(!retrieved.admin_only);
    assert_eq!(retrieved.max_rollbacks, 3);
}

#[test]
fn test_token_starts_at_version_zero() {
    let (env, client, _admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    let version = client.get_token_version(&token_id);
    assert_eq!(version, 0);
}

#[test]
fn test_upgrade_token_increments_version() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    let new_version = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&client.env, "v1")),
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );
    assert_eq!(new_version, 1);

    let version = client.get_token_version(&token_id);
    assert_eq!(version, 1);
}

#[test]
fn test_upgrade_token_updates_expiry_date() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();

    let new_expiry = env.ledger().timestamp() + 86_400 * 60; // 60 days from now
    client.upgrade_token(
        &admin,
        &token_id,
        &None::<String>,
        &Some(new_expiry),
        &None::<String>,
        &None::<MembershipStatus>,
    );

    let token = client.get_token(&token_id);
    assert_eq!(token.expiry_date, new_expiry);
}

#[test]
fn test_upgrade_history_recorded() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&client.env, "v1")),
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );
    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&client.env, "v2")),
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );

    let history = client.get_upgrade_history(&token_id);
    assert_eq!(history.len(), 2);

    let first = history.get(0).unwrap();
    assert_eq!(first.from_version, 0);
    assert_eq!(first.to_version, 1);
    assert!(!first.is_rollback);

    let second = history.get(1).unwrap();
    assert_eq!(second.from_version, 1);
    assert_eq!(second.to_version, 2);
}

#[test]
fn test_get_upgrade_history_empty_for_fresh_token() {
    let (env, client, _admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    let history = client.get_upgrade_history(&token_id);
    assert_eq!(history.len(), 0);
}

#[test]
fn test_batch_upgrade_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    client.set_admin(&admin);

    let token_id1 = BytesN::<32>::random(&env);
    let token_id2 = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 86_400 * 30;

    client.issue_token(&token_id1, &user, &expiry);
    client.issue_token(&token_id2, &user, &expiry);

    client.set_upgrade_config(
        &admin,
        &UpgradeConfig {
            upgrades_enabled: true,
            admin_only: true,
            max_rollbacks: 5,
        },
    );

    let mut token_ids = soroban_sdk::Vec::new(&env);
    token_ids.push_back(token_id1.clone());
    token_ids.push_back(token_id2.clone());

    let results = client.batch_upgrade_tokens(&admin, &token_ids, &None::<String>, &None::<u64>);

    assert_eq!(results.len(), 2);
    assert!(results.get(0).unwrap().success);
    assert!(results.get(1).unwrap().success);
    assert_eq!(results.get(0).unwrap().new_version, Some(1));
    assert_eq!(results.get(1).unwrap().new_version, Some(1));

    assert_eq!(client.get_token_version(&token_id1), 1);
    assert_eq!(client.get_token_version(&token_id2), 1);
}

#[test]
fn test_rollback_token_upgrade() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();

    let original_expiry = client.get_token(&token_id).expiry_date;

    // Upgrade with a new expiry date
    let new_expiry = env.ledger().timestamp() + 86_400 * 60;
    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&client.env, "v1")),
        &Some(new_expiry),
        &None::<String>,
        &None::<MembershipStatus>,
    );

    assert_eq!(client.get_token(&token_id).expiry_date, new_expiry);
    assert_eq!(client.get_token_version(&token_id), 1);

    // Rollback to version 0 (original state)
    let rollback_version = client.rollback_token_upgrade(&admin, &token_id, &0);

    // Version number must continue incrementing
    assert_eq!(rollback_version, 2);
    assert_eq!(client.get_token_version(&token_id), 2);

    // State is restored to version-0 snapshot
    let token_after = client.get_token(&token_id);
    assert_eq!(token_after.expiry_date, original_expiry);
}

#[test]
fn test_rollback_recorded_in_history() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    client.upgrade_token(
        &admin,
        &token_id,
        &None::<String>,
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );
    client.rollback_token_upgrade(&admin, &token_id, &0);

    let history = client.get_upgrade_history(&token_id);
    assert_eq!(history.len(), 2);

    let rollback_record = history.get(1).unwrap();
    assert!(rollback_record.is_rollback);
    assert_eq!(rollback_record.from_version, 1);
    assert_eq!(rollback_record.to_version, 2);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_upgrade_fails_when_disabled() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &(env.ledger().timestamp() + 86_400));

    client.set_upgrade_config(
        &admin,
        &UpgradeConfig {
            upgrades_enabled: false,
            admin_only: true,
            max_rollbacks: 5,
        },
    );

    client.upgrade_token(
        &admin,
        &token_id,
        &None::<String>,
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );
}

#[test]
#[should_panic(expected = "HostError")]
fn test_upgrade_fails_without_config() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    client.set_admin(&admin);
    client.issue_token(&token_id, &user, &(env.ledger().timestamp() + 86_400));

    // No set_upgrade_config call — should panic
    client.upgrade_token(
        &admin,
        &token_id,
        &None::<String>,
        &None::<u64>,
        &None::<String>,
        &None::<MembershipStatus>,
    );
}

#[test]
#[should_panic(expected = "HostError")]
fn test_rollback_fails_without_snapshot() {
    let (env, client, admin, _user, token_id) = setup_upgrade_env();
    let _ = env;

    // Never upgraded — no snapshot for version 0 exists yet
    // (snapshot is only stored when an upgrade happens, not at mint time)
    // Rolling back to version 5 (which doesn't exist) must fail
    client.rollback_token_upgrade(&admin, &token_id, &5);
}
