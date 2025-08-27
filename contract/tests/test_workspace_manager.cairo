use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

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

    start_cheat_caller_address(contract_address, owner);

    dispatcher.create_workspace('Dev Space', 10, 1);

    let occupancy = dispatcher.get_workspace_occupancy(0);
    assert(occupancy == 0, 'Initial occupancy should be 0');

    let is_available = dispatcher.is_workspace_available(0);
    assert(is_available, 'Workspace should be available');

    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_allocate_workspace() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_cheat_caller_address(contract_address, owner);

    // Create workspace
    dispatcher.create_workspace('Dev Space', 10, 1);

    // Allocate to user
    dispatcher.allocate_workspace(user, 0);

    let occupancy = dispatcher.get_workspace_occupancy(0);
    assert(occupancy == 1, 'Occupancy should be 1');

    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_deallocate_workspace() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_cheat_caller_address(contract_address, owner);

    // Create and allocate workspace
    dispatcher.create_workspace('Dev Space', 10, 1);
    dispatcher.allocate_workspace(user, 0);

    // Deallocate
    dispatcher.deallocate_workspace(user, 0);

    let occupancy = dispatcher.get_workspace_occupancy(0);
    assert(occupancy == 0, 'Occupancy should be 0');

    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_workspace_maintenance() {
    let owner = contract_address_const::<'owner'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_cheat_caller_address(contract_address, owner);

    // Create workspace
    dispatcher.create_workspace('Dev Space', 10, 1);

    // Set maintenance mode
    dispatcher.set_workspace_maintenance(0, true);

    // Workspace should not be available during maintenance
    let is_available = dispatcher.is_workspace_available(0);
    assert(!is_available, 'Workspace should not be available during maintenance');

    // Remove maintenance mode
    dispatcher.set_workspace_maintenance(0, false);

    let is_available_after = dispatcher.is_workspace_available(0);
    assert(is_available_after, 'Workspace should be available after maintenance');

    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('User already assigned',))]
fn test_double_allocation() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_cheat_caller_address(contract_address, owner);

    dispatcher.create_workspace('Dev Space', 10, 1);
    dispatcher.allocate_workspace(user, 0);
    dispatcher.allocate_workspace(user, 0); // Should panic

    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Workspace full',))]
fn test_workspace_capacity_limit() {
    let owner = contract_address_const::<'owner'>();
    let user1 = contract_address_const::<'user1'>();
    let user2 = contract_address_const::<'user2'>();
    let (contract_address, dispatcher) = deploy_workspace_manager();

    start_cheat_caller_address(contract_address, owner);

    // Create workspace with capacity 1
    dispatcher.create_workspace('Small Space', 1, 1);

    // Allocate to first user
    dispatcher.allocate_workspace(user1, 0);

    // Try to allocate to second user (should fail)
    dispatcher.allocate_workspace(user2, 0); // Should panic

    stop_cheat_caller_address(contract_address);
}
    await contract.deactivate_workspace(workspace_id).invoke(caller_address=ADMIN)
    # Try to assign user to inactive workspace (should fail)
    with pytest.raises(Exception):
        await contract.assign_user_to_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    await contract.activate_workspace(workspace_id).invoke(caller_address=ADMIN)

    # Admin assigns user to workspace
    await contract.assign_user_to_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    assigned = await contract.is_user_in_workspace(workspace_id, USER).call()
    assert assigned.result.assigned == 1

    # Admin sets user role
    await contract.set_user_role(workspace_id, USER, 2).invoke(caller_address=ADMIN)
    role = await contract.get_user_role(workspace_id, USER).call()
    assert role.result.role == 2

    # Admin removes user from workspace
    await contract.remove_user_from_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    assigned = await contract.is_user_in_workspace(workspace_id, USER).call()
    assert assigned.result.assigned == 0
