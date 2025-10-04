#![cfg(test)]

extern crate alloc;
use alloc::format;

use super::*;
use crate::AttendanceAction;
use soroban_sdk::map;
use soroban_sdk::{
    testutils::{Address as _, BytesN as BytesNTestUtils, Ledger as LedgerTestUtils},
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
    let logs = client.get_events_by_user(&user);
    assert_eq!(logs.len(), 1);

    let log = logs.get(0).unwrap();
    assert_eq!(log.user, user);

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
    let logs = client.get_events_by_user(&user);
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
    let user_logs = client.get_events_by_user(&user);
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
    let logs = client.get_events_by_user(&user);
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
