/// WorkspaceManager.cairo
/// Cairo contract for managing workspaces with capacity limits and user assignments

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[derive(Drop, Serde, starknet::Store)]
struct Workspace {
    name: felt252,
    capacity: u32,
    current_occupancy: u32,
    is_active: bool,
}

#[starknet::contract]
mod WorkspaceManager {
    use super::{Workspace, ContractAddress};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::get_caller_address;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        next_workspace_id: u32,
        workspaces: Map<u32, Workspace>,
        workspace_users: Map<(u32, ContractAddress), bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        WorkspaceCreated: WorkspaceCreated,
        UserAssigned: UserAssigned,
    }

    #[derive(Drop, starknet::Event)]
    struct WorkspaceCreated {
        workspace_id: u32,
        name: felt252,
        capacity: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct UserAssigned {
        workspace_id: u32,
        user: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.next_workspace_id.write(1); // Workspace IDs start from 1
    }

    #[abi(embed_v0)]
    impl WorkspaceManagerImpl of super::super::interface::IWorkspaceManager<ContractState> {
        fn create_workspace(ref self: ContractState, name: felt252, capacity: u32) -> u32 {
            let workspace_id = self.next_workspace_id.read();

            let workspace = Workspace {
                name,
                capacity,
                current_occupancy: 0,
                is_active: true,
            };

            self.workspaces.write(workspace_id, workspace);
            self.next_workspace_id.write(workspace_id + 1);

            self.emit(Event::WorkspaceCreated(WorkspaceCreated {
                workspace_id,
                name,
                capacity,
            }));

            workspace_id
        }

        fn assign_user_to_workspace(ref self: ContractState, user: ContractAddress, workspace_id: u32) -> bool {
            let mut workspace = self.workspaces.read(workspace_id);
            
            // Check if workspace exists (name should not be 0 for existing workspace)
            assert(workspace.name != 0, 'Workspace does not exist');
            
            // Check if user is already assigned
            let is_assigned = self.workspace_users.read((workspace_id, user));
            assert(!is_assigned, 'User already assigned');
            
            // Check capacity - panic if at capacity as per requirements
            assert(workspace.current_occupancy < workspace.capacity, 'Workspace at capacity');

            // Update workspace occupancy
            workspace.current_occupancy += 1;
            self.workspaces.write(workspace_id, workspace);
            
            // Mark user as assigned to workspace
            self.workspace_users.write((workspace_id, user), true);

            self.emit(Event::UserAssigned(UserAssigned {
                workspace_id,
                user,
            }));

            true
        }

        fn get_workspace_info(self: @ContractState, workspace_id: u32) -> (felt252, u32, u32, bool) {
            let workspace = self.workspaces.read(workspace_id);
            (workspace.name, workspace.capacity, workspace.current_occupancy, workspace.is_active)
        }
    }
}
