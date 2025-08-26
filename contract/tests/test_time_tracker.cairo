use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp};

use credenza_contract::TimeTracker::ITimeTrackerDispatcher;
use credenza_contract::TimeTracker::ITimeTrackerDispatcherTrait;

fn deploy_time_tracker() -> (ContractAddress, ITimeTrackerDispatcher) {
    let owner = contract_address_const::<'owner'>();
    let contract = declare("TimeTracker").unwrap().contract_class();
    let constructor_args = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();
    let dispatcher = ITimeTrackerDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_clock_in_out_cycle() {
    let user = contract_address_const::<'user1'>();
    let workspace_id = 1_u32;
    let biometric = 'biometric123';
    let (contract_address, dispatcher) = deploy_time_tracker();
    
    // Set initial timestamp
    start_cheat_block_timestamp(contract_address, 1000);
    
    // Clock in
    dispatcher.clock_in(user, workspace_id, biometric);
    
    // Check current session
    let (is_active, clock_in_time, ws_id) = dispatcher.get_current_session(user);
    assert(is_active, 'Session should be active');
    assert(clock_in_time == 1000, 'Wrong clock in time');
    assert(ws_id == workspace_id, 'Wrong workspace id');
    
    // Advance time by 2 hours (7200 seconds)
    start_cheat_block_timestamp(contract_address, 8200);
    
    // Clock out
    dispatcher.clock_out(user, biometric);
    
    // Check session is no longer active
    let (is_active_after, _, _) = dispatcher.get_current_session(user);
    assert(!is_active_after, 'Session should be inactive');
    
    // Check daily hours (should be 2 hours = 7200 seconds)
    let date = 0; // Day 0 (1000 / 86400 = 0)
    let daily_hours = dispatcher.get_daily_hours(user, date);
    assert(daily_hours == 7200, 'Wrong daily hours');
    
    stop_cheat_block_timestamp(contract_address);
}

#[test]
#[should_panic(expected: ('User already clocked in',))]
fn test_double_clock_in() {
    let user = contract_address_const::<'user1'>();
    let workspace_id = 1_u32;
    let biometric = 'biometric123';
    let (contract_address, dispatcher) = deploy_time_tracker();
    
    start_cheat_block_timestamp(contract_address, 1000);
    
    dispatcher.clock_in(user, workspace_id, biometric);
    dispatcher.clock_in(user, workspace_id, biometric); // Should panic
    
    stop_cheat_block_timestamp(contract_address);
}

#[test]
#[should_panic(expected: ('No active session',))]
fn test_clock_out_without_clock_in() {
    let user = contract_address_const::<'user1'>();
    let biometric = 'biometric123';
    let (contract_address, dispatcher) = deploy_time_tracker();
    
    dispatcher.clock_out(user, biometric); // Should panic
}

#[test]
fn test_weekly_hours_calculation() {
    let user = contract_address_const::<'user1'>();
    let workspace_id = 1_u32;
    let biometric = 'biometric123';
    let (contract_address, dispatcher) = deploy_time_tracker();
    
    // Day 1: Work 4 hours
    start_cheat_block_timestamp(contract_address, 86400); // Day 1
    dispatcher.clock_in(user, workspace_id, biometric);
    
    start_cheat_block_timestamp(contract_address, 86400 + 14400); // +4 hours
    dispatcher.clock_out(user, biometric);
    
    // Day 2: Work 6 hours
    start_cheat_block_timestamp(contract_address, 172800); // Day 2
    dispatcher.clock_in(user, workspace_id, biometric);
    
    start_cheat_block_timestamp(contract_address, 172800 + 21600); // +6 hours
    dispatcher.clock_out(user, biometric);
    
    // Check weekly hours (should be 10 hours = 36000 seconds)
    let week_start = 0; // Week starting from day 0
    let weekly_hours = dispatcher.get_weekly_hours(user, week_start);
    assert(weekly_hours == 36000, 'Wrong weekly hours');
    
    stop_cheat_block_timestamp(contract_address);
}

#[test]
fn test_multiple_users_different_sessions() {
    let user1 = contract_address_const::<'user1'>();
    let user2 = contract_address_const::<'user2'>();
    let workspace_id = 1_u32;
    let (contract_address, dispatcher) = deploy_time_tracker();
    
    start_cheat_block_timestamp(contract_address, 1000);
    
    // Both users clock in
    dispatcher.clock_in(user1, workspace_id, 'bio1');
    dispatcher.clock_in(user2, workspace_id, 'bio2');
    
    // Check both have active sessions
    let (active1, _, _) = dispatcher.get_current_session(user1);
    let (active2, _, _) = dispatcher.get_current_session(user2);
    assert(active1, 'User1 should be active');
    assert(active2, 'User2 should be active');
    
    // User1 clocks out
    start_cheat_block_timestamp(contract_address, 5000);
    dispatcher.clock_out(user1, 'bio1');
    
    // Check user1 inactive, user2 still active
    let (active1_after, _, _) = dispatcher.get_current_session(user1);
    let (active2_after, _, _) = dispatcher.get_current_session(user2);
    assert(!active1_after, 'User1 should be inactive');
    assert(active2_after, 'User2 should still be active');
    
    stop_cheat_block_timestamp(contract_address);
}
