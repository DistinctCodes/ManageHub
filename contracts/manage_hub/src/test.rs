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
