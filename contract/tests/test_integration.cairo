/// Integration tests for ManageHub smart contracts
/// Tests the interaction between different contract modules

use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, 
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp, stop_cheat_block_timestamp
};

use credenza_contract::UserManager::IUserManagerDispatcher;
use credenza_contract::UserManager::IUserManagerDispatcherTrait;
use credenza_contract::WorkspaceManager::IWorkspaceManagerDispatcher;
use credenza_contract::WorkspaceManager::IWorkspaceManagerDispatcherTrait;
use credenza_contract::TimeTracker::ITimeTrackerDispatcher;
use credenza_contract::TimeTracker::ITimeTrackerDispatcherTrait;
use credenza_contract::AccessControl::IAccessControlDispatcher;
use credenza_contract::AccessControl::IAccessControlDispatcherTrait;
use credenza_contract::ResourceBooking::IResourceBookingDispatcher;
use credenza_contract::ResourceBooking::IResourceBookingDispatcherTrait;
use credenza_contract::Payroll::IPayrollDispatcher;
use credenza_contract::Payroll::IPayrollDispatcherTrait;

struct ContractSuite {
    user_manager: IUserManagerDispatcher,
    workspace_manager: IWorkspaceManagerDispatcher,
    time_tracker: ITimeTrackerDispatcher,
    access_control: IAccessControlDispatcher,
    resource_booking: IResourceBookingDispatcher,
    payroll: IPayrollDispatcher,
}

fn deploy_all_contracts() -> ContractSuite {
    let owner = contract_address_const::<'owner'>();
    
    // Deploy UserManager
    let user_manager_contract = declare("UserManager").unwrap().contract_class();
    let (user_manager_address, _) = user_manager_contract.deploy(@array![owner.into()]).unwrap();
    let user_manager = IUserManagerDispatcher { contract_address: user_manager_address };
    
    // Deploy WorkspaceManager
    let workspace_manager_contract = declare("WorkspaceManager").unwrap().contract_class();
    let (workspace_manager_address, _) = workspace_manager_contract.deploy(@array![owner.into()]).unwrap();
    let workspace_manager = IWorkspaceManagerDispatcher { contract_address: workspace_manager_address };
    
    // Deploy TimeTracker
    let time_tracker_contract = declare("TimeTracker").unwrap().contract_class();
    let (time_tracker_address, _) = time_tracker_contract.deploy(@array![owner.into()]).unwrap();
    let time_tracker = ITimeTrackerDispatcher { contract_address: time_tracker_address };
    
    // Deploy AccessControl
    let access_control_contract = declare("AccessControl").unwrap().contract_class();
    let (access_control_address, _) = access_control_contract.deploy(@array![owner.into()]).unwrap();
    let access_control = IAccessControlDispatcher { contract_address: access_control_address };
    
    // Deploy ResourceBooking
    let resource_booking_contract = declare("ResourceBooking").unwrap().contract_class();
    let (resource_booking_address, _) = resource_booking_contract.deploy(@ArrayTrait::new()).unwrap();
    let resource_booking = IResourceBookingDispatcher { contract_address: resource_booking_address };
    
    // Deploy Payroll
    let payroll_contract = declare("Payroll").unwrap().contract_class();
    let (payroll_address, _) = payroll_contract.deploy(@array![owner.into()]).unwrap();
    let payroll = IPayrollDispatcher { contract_address: payroll_address };
    
    ContractSuite {
        user_manager,
        workspace_manager,
        time_tracker,
        access_control,
        resource_booking,
        payroll,
    }
}

#[test]
fn test_complete_user_workflow() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'employee1'>();
    let contracts = deploy_all_contracts();
    
    start_cheat_caller_address(contracts.user_manager.contract_address, owner);
    start_cheat_caller_address(contracts.workspace_manager.contract_address, owner);
    start_cheat_caller_address(contracts.access_control.contract_address, owner);
    start_cheat_caller_address(contracts.resource_booking.contract_address, owner);
    start_cheat_caller_address(contracts.payroll.contract_address, owner);
    start_cheat_block_timestamp(contracts.time_tracker.contract_address, 1000);
    
    // 1. Register user
    contracts.user_manager.register_user(user, 'John Doe', 1, 'biometric123');
    
    // 2. Create workspace and allocate to user
    contracts.workspace_manager.create_workspace('Dev Space', 10, 1);
    contracts.workspace_manager.allocate_workspace(user, 0);
    
    // 3. Grant resource access
    contracts.access_control.grant_access(user, 1, 2); // Write access to resource 1
    
    // 4. Create resource and book it
    contracts.resource_booking.create_resource('Projector', 1);
    let booking_id = contracts.resource_booking.book_resource(user, 0, 2000, 4000);
    
    // 5. Set hourly rate
    contracts.payroll.set_hourly_rate(user, 1000);
    
    // 6. Clock in
    contracts.time_tracker.clock_in(user, 0, 'biometric123');
    
    // 7. Advance time and clock out (work for 8 hours)
    start_cheat_block_timestamp(contracts.time_tracker.contract_address, 29800); // +8 hours
    contracts.time_tracker.clock_out(user, 'biometric123');
    
    // 8. Process payroll
    contracts.payroll.process_payroll(user, 1000, 29800);
    
    // Verify final state
    let is_user_active = contracts.user_manager.is_user_active(user);
    assert(is_user_active, 'User should be active');
    
    let workspace_occupancy = contracts.workspace_manager.get_workspace_occupancy(0);
    assert(workspace_occupancy == 1, 'Workspace should have 1 user');
    
    let access_level = contracts.access_control.check_access(user, 1);
    assert(access_level == 2, 'User should have write access');
    
    let (_, _, _, _, booking_active) = contracts.resource_booking.get_booking_info(booking_id);
    assert(booking_active, 'Booking should be active');
    
    let daily_hours = contracts.time_tracker.get_daily_hours(user, 0);
    assert(daily_hours == 28800, 'Should have 8 hours logged'); // 8 * 3600 = 28800 seconds
    
    stop_cheat_block_timestamp(contracts.time_tracker.contract_address);
    stop_cheat_caller_address(contracts.user_manager.contract_address);
    stop_cheat_caller_address(contracts.workspace_manager.contract_address);
    stop_cheat_caller_address(contracts.access_control.contract_address);
    stop_cheat_caller_address(contracts.resource_booking.contract_address);
    stop_cheat_caller_address(contracts.payroll.contract_address);
}

#[test]
fn test_user_deactivation_workflow() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'employee1'>();
    let contracts = deploy_all_contracts();
    
    start_cheat_caller_address(contracts.user_manager.contract_address, owner);
    start_cheat_caller_address(contracts.workspace_manager.contract_address, owner);
    start_cheat_caller_address(contracts.time_tracker.contract_address, owner);
    
    // Setup user and workspace
    contracts.user_manager.register_user(user, 'John Doe', 1, 'biometric123');
    contracts.workspace_manager.create_workspace('Dev Space', 10, 1);
    contracts.workspace_manager.allocate_workspace(user, 0);
    
    // User clocks in
    contracts.time_tracker.clock_in(user, 0, 'biometric123');
    
    // Deactivate user
    contracts.user_manager.deactivate_user(user);
    
    // Verify user is deactivated
    let is_active = contracts.user_manager.is_user_active(user);
    assert(!is_active, 'User should be deactivated');
    
    // Biometric verification should fail for deactivated user
    let biometric_valid = contracts.user_manager.verify_biometric(user, 'biometric123');
    assert(!biometric_valid, 'Biometric should fail for deactivated user');
    
    stop_cheat_caller_address(contracts.user_manager.contract_address);
    stop_cheat_caller_address(contracts.workspace_manager.contract_address);
    stop_cheat_caller_address(contracts.time_tracker.contract_address);
}

#[test]
fn test_resource_booking_with_access_control() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'employee1'>();
    let unauthorized_user = contract_address_const::<'unauthorized'>();
    let contracts = deploy_all_contracts();
    
    start_cheat_caller_address(contracts.access_control.contract_address, owner);
    start_cheat_caller_address(contracts.resource_booking.contract_address, owner);
    
    // Create resource
    let resource_id = contracts.resource_booking.create_resource('Conference Room', 2);
    
    // Grant access to authorized user only
    contracts.access_control.grant_access(user, resource_id, 2);
    
    // Authorized user can book (assuming access control is checked in booking logic)
    let booking_id = contracts.resource_booking.book_resource(user, resource_id, 1000, 2000);
    
    // Verify booking
    let (booker, _, _, _, is_active) = contracts.resource_booking.get_booking_info(booking_id);
    assert(booker == user, 'Wrong booker');
    assert(is_active, 'Booking should be active');
    
    // Check access levels
    let user_access = contracts.access_control.check_access(user, resource_id);
    let unauthorized_access = contracts.access_control.check_access(unauthorized_user, resource_id);
    assert(user_access == 2, 'User should have write access');
    assert(unauthorized_access == 0, 'Unauthorized user should have no access');
    
    stop_cheat_caller_address(contracts.access_control.contract_address);
    stop_cheat_caller_address(contracts.resource_booking.contract_address);
}
