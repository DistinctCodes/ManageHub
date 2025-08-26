/// WorkspaceManager.cairo
/// Cairo 2 contract for managing workspaces in a tech hub environment

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[derive(Drop, Serde, starknet::Store)]
struct Workspace {
    name: felt252,
    capacity: u32,
    current_occupancy: u32,
    workspace_type: u8,
    is_maintenance: bool,
    is_active: bool,
    created_at: u64,
}

#[starknet::interface]
pub trait IWorkspaceManager<TContractState> {
    fn create_workspace(ref self: TContractState, name: felt252, capacity: u32, workspace_type: u8);
    fn allocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn deallocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn get_workspace_occupancy(self: @TContractState, workspace_id: u32) -> u32;
    fn is_workspace_available(self: @TContractState, workspace_id: u32) -> bool;
    fn set_workspace_maintenance(ref self: TContractState, workspace_id: u32, is_maintenance: bool);
}

#[starknet::contract]
mod WorkspaceManager {
    use super::{Workspace, ContractAddress};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        workspace_count: u32,
        workspaces: Map<u32, Workspace>,
        workspace_users: Map<(u32, ContractAddress), bool>,
        user_workspace_count: Map<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        WorkspaceCreated: WorkspaceCreated,
        WorkspaceAllocated: WorkspaceAllocated,
        WorkspaceDeallocated: WorkspaceDeallocated,
        MaintenanceStatusChanged: MaintenanceStatusChanged,
    }

    #[derive(Drop, starknet::Event)]
    struct WorkspaceCreated {
        workspace_id: u32,
        name: felt252,
        capacity: u32,
        workspace_type: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct WorkspaceAllocated {
        workspace_id: u32,
        user_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct WorkspaceDeallocated {
        workspace_id: u32,
        user_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct MaintenanceStatusChanged {
        workspace_id: u32,
        is_maintenance: bool,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl WorkspaceManagerImpl of super::IWorkspaceManager<ContractState> {
        fn create_workspace(ref self: ContractState, name: felt252, capacity: u32, workspace_type: u8) {
            self.only_owner();

            let workspace_id = self.workspace_count.read();
            let timestamp = get_block_timestamp();

            let workspace = Workspace {
                name,
                capacity,
                current_occupancy: 0,
                workspace_type,
                is_maintenance: false,
                is_active: true,
                created_at: timestamp,
            };

            self.workspaces.write(workspace_id, workspace);
            self.workspace_count.write(workspace_id + 1);

            self.emit(Event::WorkspaceCreated(WorkspaceCreated {
                workspace_id,
                name,
                capacity,
                workspace_type,
            }));
        }

// Update workspace name (admin only)
@external
func update_workspace_name{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, new_name: felt252) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    let updated = Workspace(new_name, workspace.capacity, workspace.current_occupancy, workspace.is_active, workspace.created_at);
    workspaces.write(workspace_id, updated);
    let (timestamp) = get_block_timestamp();
    WorkspaceNameUpdated.emit(workspace_id, new_name, timestamp);
    return ();
}

// Update workspace capacity (admin only)
@external
func update_workspace_capacity{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, new_capacity: u32) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    assert new_capacity >= workspace.current_occupancy, 'Capacity less than occupancy';
    let updated = Workspace(workspace.name, new_capacity, workspace.current_occupancy, workspace.is_active, workspace.created_at);
    workspaces.write(workspace_id, updated);
    let (timestamp) = get_block_timestamp();
    WorkspaceCapacityUpdated.emit(workspace_id, new_capacity, timestamp);
    return ();
}

// Deactivate workspace (admin only)
@external
func deactivate_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    let updated = Workspace(workspace.name, workspace.capacity, workspace.current_occupancy, 0, workspace.created_at);
    workspaces.write(workspace_id, updated);
    let (timestamp) = get_block_timestamp();
    WorkspaceDeactivated.emit(workspace_id, timestamp);
    return ();
}

// Activate workspace (admin only)
@external
func activate_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    let updated = Workspace(workspace.name, workspace.capacity, workspace.current_occupancy, 1, workspace.created_at);
    workspaces.write(workspace_id, updated);
    let (timestamp) = get_block_timestamp();
    WorkspaceActivated.emit(workspace_id, timestamp);
    return ();
}

// Set user role in workspace (admin only)
@external
func set_user_role{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, user_address: ContractAddress, role: u8) {
    _only_admin();
    user_roles.write((workspace_id, user_address), role);
    let (timestamp) = get_block_timestamp();
    UserRoleSet.emit(workspace_id, user_address, role, timestamp);
    return ();
}

// Get user role in workspace
@view
func get_user_role{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, user_address: ContractAddress) -> (role: u8) {
    let (role) = user_roles.read((workspace_id, user_address));
    return (role,);
}

// Assign user to workspace (admin oonly)
@external
func assign_user_to_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, user_address: ContractAddress) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    assert workspace.is_active == 1, 'Workspace not active';
    let (assigned) = workspace_users.read((workspace_id, user_address));
    assert assigned == 0, 'User already assigned';
    assert workspace.current_occupancy < workspace.capacity, 'Workspace full';
    // Update occupancy
    let new_occupancy = workspace.current_occupancy + 1;
    let updated = Workspace(workspace.name, workspace.capacity, new_occupancy, workspace.is_active, workspace.created_at);
    workspaces.write(workspace_id, updated);
    workspace_users.write((workspace_id, user_address), 1);
    // Add workspace to user's list
    let (arr_len, arr) = user_workspaces.read(user_address);
    array_append(arr, workspace_id);
    user_workspaces.write(user_address, arr_len + 1, arr);
    let (timestamp) = get_block_timestamp();
    UserAssigned.emit(workspace_id, user_address, timestamp);
    return ();
}

// Remove user from workspace (admin onlly)
@external
func remove_user_from_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, user_address: ContractAddress) {
    _only_admin();
    let (workspace) = workspaces.read(workspace_id);
    let (assigned) = workspace_users.read((workspace_id, user_address));
    assert assigned == 1, 'User not assigned';
    // Update occupancy
    let new_occupancy = workspace.current_occupancy - 1;
    let updated = Workspace(workspace.name, workspace.capacity, new_occupancy, workspace.is_active, workspace.created_at);
    workspaces.write(workspace_id, updated);
    workspace_users.write((workspace_id, user_address), 0);
    // Remove workspace from user's list (not efficient, for demo)
    let (arr_len, arr) = user_workspaces.read(user_address);
    // TODO: Remove workspace_id from arr
    user_workspaces.write(user_address, arr_len - 1, arr);
    let (timestamp) = get_block_timestamp();
    UserRemoved.emit(workspace_id, user_address, timestamp);
    return ();
}

// Get workspace info
@view
func get_workspace_info{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32) -> (name: felt252, capacity: u32, occupancy: u32) {
    let (workspace) = workspaces.read(workspace_id);
    return (workspace.name, workspace.capacity, workspace.current_occupancy);
}

// Check if user is in workspace
@view
func is_user_in_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(workspace_id: u32, user_address: ContractAddress) -> (assigned: felt252) {
    let (assigned) = workspace_users.read((workspace_id, user_address));
    return (assigned,);
}
