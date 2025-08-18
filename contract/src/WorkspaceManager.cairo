// SPDX-License-Identifier: MIT
// WorkspaceManager.cairo
// Cairo 2.6+ contract for managing workspaces in a tech hub environment

%lang starknet

from starkware.cairo.common.cairo_builtins import HashBuiltin
from starkware.starknet.common.syscalls import get_block_timestamp
from starkware.starknet.common.storage import Storage
from starkware.starknet.common.syscalls import get_caller_address
from starkware.starknet.common.syscalls import get_contract_address
from starkware.cairo.common.uint256 import Uint256, uint256_add, uint256_sub
from starkware.starknet.common.syscalls import get_block_number
from starkware.starknet.common.syscalls import get_block_timestamp
from starkware.starknet.common.syscalls import get_caller_address
from starkware.starknet.common.syscalls import get_contract_address
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.array import Array, array_new, array_append, array_len, array_at
from starkware.cairo.common.legacy_map import LegacyMap
from starkware.starknet.common.syscalls import ContractAddress

@storage_var
func owner() -> (owner: ContractAddress):
end

@storage_var
func admins(addr: ContractAddress) -> (is_admin: felt252):
end

struct Workspace {
    name: felt252,
    capacity: u32,
    current_occupancy: u32,
    is_active: felt252, // bool as felt252 (0/1)
    created_at: u64
}

@storage_var
func workspaces(id: u32) -> (workspace: Workspace):
end

@storage_var
func workspace_count() -> (count: u32):
end

@storage_var
func workspace_users(key: (u32, ContractAddress)) -> (assigned: felt252):
end

@storage_var
func user_workspaces(addr: ContractAddress) -> (arr_len: u32, arr: Array<u32>):
end

@event
func WorkspaceCreated(workspace_id: u32, name: felt252, capacity: u32, timestamp: u64):
end

@event
func UserAssigned(workspace_id: u32, user_address: ContractAddress, timestamp: u64):
end

@event
func UserRemoved(workspace_id: u32, user_address: ContractAddress, timestamp: u64):
end

// Internal helper to restrict to admins only
func _only_admin() {
    let (caller) = get_caller_address();
    let (is_admin) = admins.read(caller);
    assert is_admin == 1, 'Not an admin';
    return ();
}

@constructor
func constructor{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(owner_: ContractAddress) {
    owner.write(owner_);
    admins.write(owner_, 1);
    return ();
}

// Create aa new workspace (admin only)
@external
func create_workspace{syscall_ptr: felt*, pedersen_ptr: HashBuiltin*, range_check_ptr}(name: felt252, capacity: u32) -> (workspace_id: u32) {
    _only_admin();
    let (count) = workspace_count.read();
    let workspace_id = count;
    let (timestamp) = get_block_timestamp();
    let workspace = Workspace(name, capacity, 0, 1, timestamp);
    workspaces.write(workspace_id, workspace);
    workspace_count.write(workspace_id + 1);
    WorkspaceCreated.emit(workspace_id, name, capacity, timestamp);
    return (workspace_id,);
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
