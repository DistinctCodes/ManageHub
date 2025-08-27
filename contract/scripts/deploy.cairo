/// Deployment script for ManageHub smart contracts
/// This script demonstrates how to deploy and initialize all contracts

use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};

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

struct DeployedContracts {
    user_manager: IUserManagerDispatcher,
    workspace_manager: IWorkspaceManagerDispatcher,
    time_tracker: ITimeTrackerDispatcher,
    access_control: IAccessControlDispatcher,
    resource_booking: IResourceBookingDispatcher,
    payroll: IPayrollDispatcher,
}

/// Deploy all ManageHub contracts
fn deploy_managehub_suite(owner: ContractAddress) -> DeployedContracts {
    // Deploy UserManager
    let user_manager_class = declare("UserManager").unwrap().contract_class();
    let (user_manager_address, _) = user_manager_class.deploy(@array![owner.into()]).unwrap();
    let user_manager = IUserManagerDispatcher { contract_address: user_manager_address };
    
    // Deploy WorkspaceManager
    let workspace_manager_class = declare("WorkspaceManager").unwrap().contract_class();
    let (workspace_manager_address, _) = workspace_manager_class.deploy(@array![owner.into()]).unwrap();
    let workspace_manager = IWorkspaceManagerDispatcher { contract_address: workspace_manager_address };
    
    // Deploy TimeTracker
    let time_tracker_class = declare("TimeTracker").unwrap().contract_class();
    let (time_tracker_address, _) = time_tracker_class.deploy(@array![owner.into()]).unwrap();
    let time_tracker = ITimeTrackerDispatcher { contract_address: time_tracker_address };
    
    // Deploy AccessControl
    let access_control_class = declare("AccessControl").unwrap().contract_class();
    let (access_control_address, _) = access_control_class.deploy(@array![owner.into()]).unwrap();
    let access_control = IAccessControlDispatcher { contract_address: access_control_address };
    
    // Deploy ResourceBooking
    let resource_booking_class = declare("ResourceBooking").unwrap().contract_class();
    let (resource_booking_address, _) = resource_booking_class.deploy(@ArrayTrait::new()).unwrap();
    let resource_booking = IResourceBookingDispatcher { contract_address: resource_booking_address };
    
    // Deploy Payroll
    let payroll_class = declare("Payroll").unwrap().contract_class();
    let (payroll_address, _) = payroll_class.deploy(@array![owner.into()]).unwrap();
    let payroll = IPayrollDispatcher { contract_address: payroll_address };
    
    DeployedContracts {
        user_manager,
        workspace_manager,
        time_tracker,
        access_control,
        resource_booking,
        payroll,
    }
}

/// Initialize contracts with sample data
fn initialize_sample_data(contracts: DeployedContracts, owner: ContractAddress) {
    // Create sample users
    let employee1 = contract_address_const::<'employee1'>();
    let employee2 = contract_address_const::<'employee2'>();
    let manager1 = contract_address_const::<'manager1'>();
    
    contracts.user_manager.register_user(employee1, 'Alice Smith', 1, 'bio_alice');
    contracts.user_manager.register_user(employee2, 'Bob Johnson', 1, 'bio_bob');
    contracts.user_manager.register_user(manager1, 'Carol Manager', 2, 'bio_carol');
    
    // Create sample workspaces
    contracts.workspace_manager.create_workspace('Development Floor', 20, 1);
    contracts.workspace_manager.create_workspace('Meeting Rooms', 8, 2);
    contracts.workspace_manager.create_workspace('Co-working Space', 50, 3);
    
    // Allocate workspaces
    contracts.workspace_manager.allocate_workspace(employee1, 0);
    contracts.workspace_manager.allocate_workspace(employee2, 0);
    contracts.workspace_manager.allocate_workspace(manager1, 1);
    
    // Create access groups
    contracts.access_control.create_access_group('Developers', 0x555555); // Read/Write access pattern
    contracts.access_control.create_access_group('Managers', 0xFFFFFF); // Admin access pattern
    
    // Add users to groups
    contracts.access_control.add_user_to_group(employee1, 0);
    contracts.access_control.add_user_to_group(employee2, 0);
    contracts.access_control.add_user_to_group(manager1, 1);
    
    // Create sample resources
    contracts.resource_booking.create_resource('Conference Room A', 1);
    contracts.resource_booking.create_resource('Projector #1', 2);
    contracts.resource_booking.create_resource('Whiteboard', 3);
    
    // Set hourly rates
    contracts.payroll.set_hourly_rate(employee1, 2500); // 25.00 per hour (in cents)
    contracts.payroll.set_hourly_rate(employee2, 2800); // 28.00 per hour
    contracts.payroll.set_hourly_rate(manager1, 4500); // 45.00 per hour
}

#[test]
fn test_full_deployment_and_initialization() {
    let owner = contract_address_const::<'owner'>();
    
    // Deploy all contracts
    let contracts = deploy_managehub_suite(owner);
    
    // Initialize with sample data
    initialize_sample_data(contracts, owner);
    
    // Verify deployment
    let employee1 = contract_address_const::<'employee1'>();
    
    // Check user registration
    let is_active = contracts.user_manager.is_user_active(employee1);
    assert(is_active, 'Employee1 should be active');
    
    let role = contracts.user_manager.get_user_role(employee1);
    assert(role == 1, 'Employee1 should be member');
    
    // Check workspace allocation
    let occupancy = contracts.workspace_manager.get_workspace_occupancy(0);
    assert(occupancy == 2, 'Dev floor should have 2 users');
    
    // Check access control
    let access = contracts.access_control.check_access(employee1, 0);
    assert(access > 0, 'Employee1 should have access');
    
    // Check payroll rate
    let rate = contracts.payroll.get_hourly_rate(employee1);
    assert(rate == 2500, 'Wrong hourly rate');
}

/// Example of a complete user workflow
#[test]
fn test_employee_daily_workflow() {
    let owner = contract_address_const::<'owner'>();
    let employee = contract_address_const::<'employee1'>();
    
    let contracts = deploy_managehub_suite(owner);
    initialize_sample_data(contracts, owner);
    
    // Employee clocks in
    contracts.time_tracker.clock_in(employee, 0, 'bio_alice');
    
    // Employee books a meeting room
    let booking_id = contracts.resource_booking.book_resource(employee, 0, 2000, 4000);
    
    // Verify booking
    let (booker, resource_id, start_time, end_time, is_active) = contracts.resource_booking.get_booking_info(booking_id);
    assert(booker == employee, 'Wrong booker');
    assert(is_active, 'Booking should be active');
    
    // Employee clocks out after 8 hours
    contracts.time_tracker.clock_out(employee, 'bio_alice');
    
    // Process payroll for the day
    contracts.payroll.process_payroll(employee, 1000, 29800); // 8 hour period
}
