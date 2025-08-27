use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use credenza_contract::AccessControl::IAccessControlDispatcher;
use credenza_contract::AccessControl::IAccessControlDispatcherTrait;

fn deploy_access_control() -> (ContractAddress, IAccessControlDispatcher) {
    let owner = contract_address_const::<'owner'>();
    let contract = declare("AccessControl").unwrap().contract_class();
    let constructor_args = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();
    let dispatcher = IAccessControlDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_grant_and_check_access() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let resource_id = 1_u32;
    let access_level = 2_u8; // WRITE access
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Grant access
    dispatcher.grant_access(user, resource_id, access_level);
    
    // Check access
    let granted_access = dispatcher.check_access(user, resource_id);
    assert(granted_access == access_level, 'Wrong access level');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_revoke_access() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let resource_id = 1_u32;
    let access_level = 2_u8;
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Grant then revoke access
    dispatcher.grant_access(user, resource_id, access_level);
    dispatcher.revoke_access(user, resource_id);
    
    // Check access is revoked
    let access_after = dispatcher.check_access(user, resource_id);
    assert(access_after == 0, 'Access should be revoked');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_create_access_group() {
    let owner = contract_address_const::<'owner'>();
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    let group_name = 'Developers';
    let permissions = 0x123456789; // Some permission bitmap
    
    dispatcher.create_access_group(group_name, permissions);
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_add_user_to_group() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create group first
    let group_name = 'Developers';
    let permissions = 0x123456789;
    dispatcher.create_access_group(group_name, permissions);
    
    // Add user to group
    let group_id = 0_u32; // First group
    dispatcher.add_user_to_group(user, group_id);
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Invalid access level',))]
fn test_invalid_access_level() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let resource_id = 1_u32;
    let invalid_access_level = 5_u8; // Invalid (max is 3)
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.grant_access(user, resource_id, invalid_access_level); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Not contract owner',))]
fn test_unauthorized_grant_access() {
    let owner = contract_address_const::<'owner'>();
    let unauthorized = contract_address_const::<'unauthorized'>();
    let user = contract_address_const::<'user1'>();
    let resource_id = 1_u32;
    let access_level = 2_u8;
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, unauthorized);
    
    dispatcher.grant_access(user, resource_id, access_level); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_group_based_access() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let resource_id = 1_u32;
    let (contract_address, dispatcher) = deploy_access_control();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create group with permissions for resource 1 (access level 2)
    // Permissions bitmap: resource 1 gets bits 2-3, so value = 2 << 2 = 8
    let permissions = 8_u256;
    dispatcher.create_access_group('TestGroup', permissions);
    
    // Add user to group
    dispatcher.add_user_to_group(user, 0);
    
    // Check user has group-based access
    let access = dispatcher.check_access(user, resource_id);
    assert(access == 2, 'Should have group-based access');
    
    stop_cheat_caller_address(contract_address);
}
