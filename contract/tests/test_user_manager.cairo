use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use credenza_contract::UserManager::IUserManagerDispatcher;
use credenza_contract::UserManager::IUserManagerDispatcherTrait;

fn deploy_user_manager() -> (ContractAddress, IUserManagerDispatcher) {
    let owner = contract_address_const::<'owner'>();
    let contract = declare("UserManager").unwrap().contract_class();
    let constructor_args = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();
    let dispatcher = IUserManagerDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_register_user() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123');
    
    let role = dispatcher.get_user_role(user);
    assert(role == 1, 'Wrong role');
    
    let is_active = dispatcher.is_user_active(user);
    assert(is_active, 'User should be active');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_biometric_verification() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123');
    
    // Test correct biometric
    let verified = dispatcher.verify_biometric(user, 'biometric123');
    assert(verified, 'Should verify correct biometric');
    
    // Test incorrect biometric
    let not_verified = dispatcher.verify_biometric(user, 'wrong_biometric');
    assert(!not_verified, 'Should not verify wrong biometric');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_update_biometric() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123');
    
    // Update biometric
    dispatcher.update_biometric(user, 'new_biometric');
    
    // Test old biometric fails
    let old_verified = dispatcher.verify_biometric(user, 'biometric123');
    assert(!old_verified, 'Old biometric should not work');
    
    // Test new biometric works
    let new_verified = dispatcher.verify_biometric(user, 'new_biometric');
    assert(new_verified, 'New biometric should work');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_deactivate_user() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123');
    
    // User should be active initially
    let is_active = dispatcher.is_user_active(user);
    assert(is_active, 'User should be active');
    
    // Deactivate user
    dispatcher.deactivate_user(user);
    
    // User should be inactive
    let is_active_after = dispatcher.is_user_active(user);
    assert(!is_active_after, 'User should be inactive');
    
    // Role should be 0 for inactive user
    let role = dispatcher.get_user_role(user);
    assert(role == 0, 'Inactive user role should be 0');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('User already exists',))]
fn test_register_duplicate_user() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123');
    dispatcher.register_user(user, 'Jane Doe', 2, 'biometric456'); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Not admin or owner',))]
fn test_unauthorized_registration() {
    let owner = contract_address_const::<'owner'>();
    let unauthorized = contract_address_const::<'unauthorized'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_user_manager();
    
    start_cheat_caller_address(contract_address, unauthorized);
    
    dispatcher.register_user(user, 'John Doe', 1, 'biometric123'); // Should panic
    
    stop_cheat_caller_address(contract_address);
}
