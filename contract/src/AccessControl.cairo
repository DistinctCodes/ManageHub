/// AccessControl.cairo
/// Cairo 2 contract for managing resource access and group permissions

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

#[derive(Drop, Serde, starknet::Store)]
struct AccessGroup {
    name: felt252,
    permissions: u256,
    is_active: bool,
    created_at: u64,
}

// Access levels: 0 = none, 1 = read, 2 = write, 3 = admin
const ACCESS_NONE: u8 = 0;
const ACCESS_READ: u8 = 1;
const ACCESS_WRITE: u8 = 2;
const ACCESS_ADMIN: u8 = 3;

#[starknet::contract]
mod AccessControl {
    use super::{AccessGroup, ContractAddress, ACCESS_NONE, ACCESS_READ, ACCESS_WRITE, ACCESS_ADMIN};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        // Direct resource access: user -> resource_id -> access_level
        user_resource_access: Map<(ContractAddress, u32), u8>,
        // Access groups
        group_count: u32,
        access_groups: Map<u32, AccessGroup>,
        // Group membership: user -> group_id -> is_member
        group_members: Map<(ContractAddress, u32), bool>,
        // User group count for efficient iteration
        user_group_count: Map<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AccessGranted: AccessGranted,
        AccessRevoked: AccessRevoked,
        AccessGroupCreated: AccessGroupCreated,
        UserAddedToGroup: UserAddedToGroup,
        UserRemovedFromGroup: UserRemovedFromGroup,
    }

    #[derive(Drop, starknet::Event)]
    struct AccessGranted {
        user_address: ContractAddress,
        resource_id: u32,
        access_level: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct AccessRevoked {
        user_address: ContractAddress,
        resource_id: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct AccessGroupCreated {
        group_id: u32,
        group_name: felt252,
        permissions: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct UserAddedToGroup {
        user_address: ContractAddress,
        group_id: u32,
    }

    #[derive(Drop, starknet::Event)]
    struct UserRemovedFromGroup {
        user_address: ContractAddress,
        group_id: u32,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    fn only_admin_access(self: @ContractState, resource_id: u32) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        if caller != stored_owner {
            let access_level = self.user_resource_access.read((caller, resource_id));
            assert(access_level >= ACCESS_ADMIN, 'Insufficient access');
        }
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl AccessControlImpl of super::super::IAccessControl<ContractState> {
        fn grant_access(ref self: ContractState, user_address: ContractAddress, resource_id: u32, access_level: u8) {
            self.only_admin_access(resource_id);
            
            assert(access_level <= ACCESS_ADMIN, 'Invalid access level');
            
            self.user_resource_access.write((user_address, resource_id), access_level);
            
            self.emit(Event::AccessGranted(AccessGranted {
                user_address,
                resource_id,
                access_level,
            }));
        }

        fn revoke_access(ref self: ContractState, user_address: ContractAddress, resource_id: u32) {
            self.only_admin_access(resource_id);
            
            self.user_resource_access.write((user_address, resource_id), ACCESS_NONE);
            
            self.emit(Event::AccessRevoked(AccessRevoked {
                user_address,
                resource_id,
            }));
        }

        fn check_access(self: @ContractState, user_address: ContractAddress, resource_id: u32) -> u8 {
            // Check direct access first
            let direct_access = self.user_resource_access.read((user_address, resource_id));
            if direct_access > ACCESS_NONE {
                return direct_access;
            }
            
            // Check group-based access
            let mut max_access = ACCESS_NONE;
            let mut group_id: u32 = 0;
            let group_count = self.group_count.read();
            
            loop {
                if group_id >= group_count { break; }
                
                let is_member = self.group_members.read((user_address, group_id));
                if is_member {
                    let group = self.access_groups.read(group_id);
                    if group.is_active {
                        // Extract access level for this resource from permissions bitmap
                        // Each resource gets 2 bits (0-3 access levels)
                        let shift = (resource_id % 128) * 2; // 256 bits / 2 bits per resource = 128 resources max
                        let mask: u256 = 3; // 0b11
                        let resource_access = ((group.permissions >> shift) & mask).try_into().unwrap();
                        if resource_access > max_access {
                            max_access = resource_access;
                        }
                    }
                }
                group_id += 1;
            };
            
            max_access
        }

        fn create_access_group(ref self: ContractState, group_name: felt252, permissions: u256) {
            self.only_owner();
            
            let group_id = self.group_count.read();
            let timestamp = get_block_timestamp();
            
            let group = AccessGroup {
                name: group_name,
                permissions,
                is_active: true,
                created_at: timestamp,
            };
            
            self.access_groups.write(group_id, group);
            self.group_count.write(group_id + 1);
            
            self.emit(Event::AccessGroupCreated(AccessGroupCreated {
                group_id,
                group_name,
                permissions,
            }));
        }

        fn add_user_to_group(ref self: ContractState, user_address: ContractAddress, group_id: u32) {
            self.only_owner();
            
            // Verify group exists
            let group = self.access_groups.read(group_id);
            assert(group.name != 0, 'Group does not exist');
            assert(group.is_active, 'Group not active');
            
            // Check if user is already in group
            let is_member = self.group_members.read((user_address, group_id));
            assert(!is_member, 'User already in group');
            
            self.group_members.write((user_address, group_id), true);
            
            // Update user group count
            let user_groups = self.user_group_count.read(user_address);
            self.user_group_count.write(user_address, user_groups + 1);
            
            self.emit(Event::UserAddedToGroup(UserAddedToGroup {
                user_address,
                group_id,
            }));
        }
    }

    // Additional helper functions for enhanced functionality
    #[generate_trait]
    impl AccessControlHelpers of AccessControlHelpersTrait {
        fn remove_user_from_group(ref self: ContractState, user_address: ContractAddress, group_id: u32) {
            self.only_owner();
            
            let is_member = self.group_members.read((user_address, group_id));
            assert(is_member, 'User not in group');
            
            self.group_members.write((user_address, group_id), false);
            
            // Update user group count
            let user_groups = self.user_group_count.read(user_address);
            self.user_group_count.write(user_address, user_groups - 1);
            
            self.emit(Event::UserRemovedFromGroup(UserRemovedFromGroup {
                user_address,
                group_id,
            }));
        }

        fn deactivate_group(ref self: ContractState, group_id: u32) {
            self.only_owner();
            
            let mut group = self.access_groups.read(group_id);
            assert(group.name != 0, 'Group does not exist');
            
            group.is_active = false;
            self.access_groups.write(group_id, group);
        }

        fn get_group_info(self: @ContractState, group_id: u32) -> (felt252, u256, bool, u64) {
            let group = self.access_groups.read(group_id);
            (group.name, group.permissions, group.is_active, group.created_at)
        }

        fn is_user_in_group(self: @ContractState, user_address: ContractAddress, group_id: u32) -> bool {
            self.group_members.read((user_address, group_id))
        }
    }
}
