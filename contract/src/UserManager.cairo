/// UserManager.cairo
/// Cairo 2 contract for managing users, roles, and biometric verification

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

#[derive(Drop, Serde, starknet::Store)]
struct User {
    name: felt252,
    role: u8,
    biometric_hash: felt252,
    is_active: bool,
    registered_at: u64,
}

// User roles: 0 = none, 1 = member, 2 = manager, 3 = admin
const ROLE_NONE: u8 = 0;
const ROLE_MEMBER: u8 = 1;
const ROLE_MANAGER: u8 = 2;
const ROLE_ADMIN: u8 = 3;

#[starknet::contract]
mod UserManager {
    use super::{User, ContractAddress, ROLE_NONE, ROLE_MEMBER, ROLE_MANAGER, ROLE_ADMIN};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        users: Map<ContractAddress, User>,
        user_count: u32,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        UserRegistered: UserRegistered,
        BiometricUpdated: BiometricUpdated,
        UserDeactivated: UserDeactivated,
        UserRoleUpdated: UserRoleUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct UserRegistered {
        user_address: ContractAddress,
        name: felt252,
        role: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct BiometricUpdated {
        user_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct UserDeactivated {
        user_address: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct UserRoleUpdated {
        user_address: ContractAddress,
        old_role: u8,
        new_role: u8,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    fn only_admin_or_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        if caller != stored_owner {
            let user = self.users.read(caller);
            assert(user.role >= ROLE_ADMIN, 'Not admin or owner');
        }
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl UserManagerImpl of super::super::interface::IUserManager<ContractState> {
        fn register_user(ref self: ContractState, user_address: ContractAddress, name: felt252, role: u8, biometric_hash: felt252) {
            self.only_admin_or_owner();
            
            // Validate role
            assert(role <= ROLE_ADMIN, 'Invalid role');
            
            // Check if user already exists
            let existing_user = self.users.read(user_address);
            assert(existing_user.name == 0, 'User already exists');
            
            let timestamp = get_block_timestamp();
            let user = User {
                name,
                role,
                biometric_hash,
                is_active: true,
                registered_at: timestamp,
            };
            
            self.users.write(user_address, user);
            let count = self.user_count.read();
            self.user_count.write(count + 1);
            
            self.emit(Event::UserRegistered(UserRegistered {
                user_address,
                name,
                role,
            }));
        }

        fn update_biometric(ref self: ContractState, user_address: ContractAddress, new_biometric_hash: felt252) {
            let caller = get_caller_address();
            
            // User can update their own biometric or admin/owner can update any
            if caller != user_address {
                self.only_admin_or_owner();
            }
            
            let mut user = self.users.read(user_address);
            assert(user.name != 0, 'User does not exist');
            assert(user.is_active, 'User not active');
            
            user.biometric_hash = new_biometric_hash;
            self.users.write(user_address, user);
            
            self.emit(Event::BiometricUpdated(BiometricUpdated {
                user_address,
            }));
        }

        fn verify_biometric(self: @ContractState, user_address: ContractAddress, biometric_hash: felt252) -> bool {
            let user = self.users.read(user_address);
            user.is_active && user.biometric_hash == biometric_hash
        }

        fn get_user_role(self: @ContractState, user_address: ContractAddress) -> u8 {
            let user = self.users.read(user_address);
            if user.is_active { user.role } else { ROLE_NONE }
        }

        fn is_user_active(self: @ContractState, user_address: ContractAddress) -> bool {
            let user = self.users.read(user_address);
            user.is_active
        }

        fn deactivate_user(ref self: ContractState, user_address: ContractAddress) {
            self.only_admin_or_owner();
            
            let mut user = self.users.read(user_address);
            assert(user.name != 0, 'User does not exist');
            assert(user.is_active, 'User already inactive');
            
            user.is_active = false;
            self.users.write(user_address, user);
            
            self.emit(Event::UserDeactivated(UserDeactivated {
                user_address,
            }));
        }
    }

    // Additional helper functions for enhanced functionality
    #[generate_trait]
    impl UserManagerHelpers of UserManagerHelpersTrait {
        fn update_user_role(ref self: ContractState, user_address: ContractAddress, new_role: u8) {
            self.only_admin_or_owner();
            
            assert(new_role <= ROLE_ADMIN, 'Invalid role');
            
            let mut user = self.users.read(user_address);
            assert(user.name != 0, 'User does not exist');
            
            let old_role = user.role;
            user.role = new_role;
            self.users.write(user_address, user);
            
            self.emit(Event::UserRoleUpdated(UserRoleUpdated {
                user_address,
                old_role,
                new_role,
            }));
        }

        fn get_user_info(self: @ContractState, user_address: ContractAddress) -> (felt252, u8, bool, u64) {
            let user = self.users.read(user_address);
            (user.name, user.role, user.is_active, user.registered_at)
        }

        fn get_total_users(self: @ContractState) -> u32 {
            self.user_count.read()
        }
    }
}
