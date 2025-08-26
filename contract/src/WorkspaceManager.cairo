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

        fn allocate_workspace(ref self: ContractState, user_address: ContractAddress, workspace_id: u32) {
            self.only_owner();

            let workspace = self.workspaces.read(workspace_id);
            assert(workspace.is_active, 'Workspace not active');
            assert(!workspace.is_maintenance, 'Workspace under maintenance');

            let is_assigned = self.workspace_users.read((workspace_id, user_address));
            assert(!is_assigned, 'User already assigned');
            assert(workspace.current_occupancy < workspace.capacity, 'Workspace full');

            // Update workspace occupancy
            let updated_workspace = Workspace {
                name: workspace.name,
                capacity: workspace.capacity,
                current_occupancy: workspace.current_occupancy + 1,
                workspace_type: workspace.workspace_type,
                is_maintenance: workspace.is_maintenance,
                is_active: workspace.is_active,
                created_at: workspace.created_at,
            };

            self.workspaces.write(workspace_id, updated_workspace);
            self.workspace_users.write((workspace_id, user_address), true);

            // Update user workspace count
            let user_count = self.user_workspace_count.read(user_address);
            self.user_workspace_count.write(user_address, user_count + 1);

            self.emit(Event::WorkspaceAllocated(WorkspaceAllocated {
                workspace_id,
                user_address,
            }));
        }

        fn deallocate_workspace(ref self: ContractState, user_address: ContractAddress, workspace_id: u32) {
            self.only_owner();

            let workspace = self.workspaces.read(workspace_id);
            let is_assigned = self.workspace_users.read((workspace_id, user_address));
            assert(is_assigned, 'User not assigned');

            // Update workspace occupancy
            let updated_workspace = Workspace {
                name: workspace.name,
                capacity: workspace.capacity,
                current_occupancy: workspace.current_occupancy - 1,
                workspace_type: workspace.workspace_type,
                is_maintenance: workspace.is_maintenance,
                is_active: workspace.is_active,
                created_at: workspace.created_at,
            };

            self.workspaces.write(workspace_id, updated_workspace);
            self.workspace_users.write((workspace_id, user_address), false);

            // Update user workspace count
            let user_count = self.user_workspace_count.read(user_address);
            self.user_workspace_count.write(user_address, user_count - 1);

            self.emit(Event::WorkspaceDeallocated(WorkspaceDeallocated {
                workspace_id,
                user_address,
            }));
        }

        fn get_workspace_occupancy(self: @ContractState, workspace_id: u32) -> u32 {
            let workspace = self.workspaces.read(workspace_id);
            workspace.current_occupancy
        }

        fn is_workspace_available(self: @ContractState, workspace_id: u32) -> bool {
            let workspace = self.workspaces.read(workspace_id);
            workspace.is_active && !workspace.is_maintenance && workspace.current_occupancy < workspace.capacity
        }

        fn set_workspace_maintenance(ref self: ContractState, workspace_id: u32, is_maintenance: bool) {
            self.only_owner();

            let workspace = self.workspaces.read(workspace_id);
            let updated_workspace = Workspace {
                name: workspace.name,
                capacity: workspace.capacity,
                current_occupancy: workspace.current_occupancy,
                workspace_type: workspace.workspace_type,
                is_maintenance,
                is_active: workspace.is_active,
                created_at: workspace.created_at,
            };

            self.workspaces.write(workspace_id, updated_workspace);

            self.emit(Event::MaintenanceStatusChanged(MaintenanceStatusChanged {
                workspace_id,
                is_maintenance,
            }));
        }
    }
}
