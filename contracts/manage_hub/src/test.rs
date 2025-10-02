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
