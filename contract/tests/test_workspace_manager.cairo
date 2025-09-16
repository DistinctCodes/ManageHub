use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_prank, stop_prank};

use credenza_contract::WorkspaceManager::IWorkspaceManagerDispatcher;
use credenza_contract::WorkspaceManager::IWorkspaceManagerDispatcherTrait;

fn deploy_workspace_manager() -> (ContractAddress, IWorkspaceManagerDispatcher) {
    let owner = contract_address_const::<'owner'>();
    let contract = declare("WorkspaceManager").unwrap().contract_class();
    let constructor_args = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();
    let dispatcher = IWorkspaceManagerDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_create_workspace() {
    let owner = contract_address_const::<'owner'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    // Create workspace with name 'DevSpace' and capacity 10
    let workspace_id = dispatcher.create_workspace('DevSpace', 10);

    // Verify workspace ID starts from 1
    assert(workspace_id == 1, 'First workspace ID should be 1');

    // Verify workspace info
    let (name, capacity, current_occupancy, is_active) = dispatcher.get_workspace_info(workspace_id);
    assert(name == 'DevSpace', 'Name should match');
    assert(capacity == 10, 'Capacity should match');
    assert(current_occupancy == 0, 'Initial occupancy should be 0');
    assert(is_active == true, 'Workspace should be active');

    stop_prank(contract_address);
}

#[test]
fn test_assign_user_to_workspace() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    // Create workspace
    let workspace_id = dispatcher.create_workspace('DevSpace', 10);

    // Assign user to workspace
    let result = dispatcher.assign_user_to_workspace(user, workspace_id);
    assert(result == true, 'Assignment should return true');

    // Verify occupancy incremented
    let (_, _, current_occupancy, _) = dispatcher.get_workspace_info(workspace_id);
    assert(current_occupancy == 1, 'Occupancy should increment to 1');

    stop_prank(contract_address);
}

#[test]
#[should_panic(expected: ('Workspace at capacity',))]
fn test_assign_user_exceeds_capacity() {
    let owner = contract_address_const::<'owner'>();
    let user1 = contract_address_const::<'user1'>();
    let user2 = contract_address_const::<'user2'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    // Create workspace with capacity 1
    let workspace_id = dispatcher.create_workspace('SmallSpace', 1);

    // Assign first user
    dispatcher.assign_user_to_workspace(user1, workspace_id);

    // Try to assign second user (should panic)
    dispatcher.assign_user_to_workspace(user2, workspace_id);

    stop_prank(contract_address);
}

#[test]
fn test_multiple_workspaces() {
    let owner = contract_address_const::<'owner'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    // Create multiple workspaces
    let workspace_id1 = dispatcher.create_workspace('Space1', 5);
    let workspace_id2 = dispatcher.create_workspace('Space2', 3);
    let workspace_id3 = dispatcher.create_workspace('Space3', 8);

    // Verify IDs increment correctly
    assert(workspace_id1 == 1, 'First ID should be 1');
    assert(workspace_id2 == 2, 'Second ID should be 2');
    assert(workspace_id3 == 3, 'Third ID should be 3');

    // Verify each workspace info
    let (name1, capacity1, occupancy1, active1) = dispatcher.get_workspace_info(workspace_id1);
    assert(name1 == 'Space1', 'Name1 should match');
    assert(capacity1 == 5, 'Capacity1 should match');
    assert(occupancy1 == 0, 'Occupancy1 should be 0');
    assert(active1 == true, 'Active1 should be true');

    let (name2, capacity2, occupancy2, active2) = dispatcher.get_workspace_info(workspace_id2);
    assert(name2 == 'Space2', 'Name2 should match');
    assert(capacity2 == 3, 'Capacity2 should match');
    assert(occupancy2 == 0, 'Occupancy2 should be 0');
    assert(active2 == true, 'Active2 should be true');

    stop_prank(contract_address);
}

#[test]
#[should_panic(expected: ('User already assigned',))]
fn test_assign_same_user_twice() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    let workspace_id = dispatcher.create_workspace('TestSpace', 5);
    
    // Assign user first time
    dispatcher.assign_user_to_workspace(user, workspace_id);
    
    // Try to assign same user again (should panic)
    dispatcher.assign_user_to_workspace(user, workspace_id);

    stop_prank(contract_address);
}

#[test]
#[should_panic(expected: ('Workspace does not exist',))]
fn test_assign_user_to_nonexistent_workspace() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_prank(contract_address, owner);

    // Try to assign user to non-existent workspace (should panic)
    dispatcher.assign_user_to_workspace(user, 999);

    stop_prank(contract_address);
}
