#![cfg(test)]

use soroban_sdk::{contract, contractimpl, contracttype, testutils::Address as _, Address, Env};

// Re-declare the contract structures for integration testing
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
}

#[contract]
pub struct ManageHubContract;

#[contractimpl]
impl ManageHubContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
    }
    
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Contract not initialized"))
    }
    
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Admin)
    }
    
 
}

// Integration Tests
#[test]
fn test_contract_initialization() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    env.mock_all_auths();
    
    // Test initialization
    client.initialize(&admin);
    
    // Verify admin is set correctly
    let stored_admin = client.get_admin();
    assert_eq!(stored_admin, admin);
    
    println!("✓ Contract initialized successfully with admin");
}

#[test]
fn test_admin_verification() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    env.mock_all_auths();
    
    // Initialize contract
    client.initialize(&admin);
    
    // Verify the admin setup
    let retrieved_admin = client.get_admin();
    assert_eq!(retrieved_admin, admin, "Admin address should match");
    
    // Verify initialization status
    assert!(client.is_initialized(), "Contract should be initialized");
    
    println!("✓ Admin setup verified successfully");
}

#[test]
fn test_initialization_status_check() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    // Check before initialization
    assert!(!client.is_initialized(), "Contract should not be initialized yet");
    
    let admin = Address::generate(&env);
    env.mock_all_auths();
    
    // Initialize
    client.initialize(&admin);
    
    // Check after initialization
    assert!(client.is_initialized(), "Contract should be initialized now");
    
    println!("✓ Initialization status checks passed");
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_prevent_double_initialization() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    
    env.mock_all_auths();
    
    // First initialization
    client.initialize(&admin1);
    
    // Second initialization should panic
    client.initialize(&admin2);
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn test_get_admin_uninitialized_contract() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    // Should panic when getting admin from uninitialized contract
    client.get_admin();
}


#[test]
fn test_multiple_admin_operations() {
    let env = Env::default();
    let contract_id = env.register_contract(None, ManageHubContract);
    let client = ManageHubContractClient::new(&env, &contract_id);
    
    let admin = Address::generate(&env);
    env.mock_all_auths();
    
    // Initialize
    client.initialize(&admin);
    
    // Multiple get_admin calls should work
    let admin1 = client.get_admin();
    let admin2 = client.get_admin();
    let admin3 = client.get_admin();
    
    assert_eq!(admin1, admin);
    assert_eq!(admin2, admin);
    assert_eq!(admin3, admin);
    
    println!("✓ Multiple admin operations completed successfully");
}