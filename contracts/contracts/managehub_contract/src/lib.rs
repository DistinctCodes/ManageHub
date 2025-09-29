#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Storage keys for contract data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin, // Stores the contract administrator address
}

/// ManageHub Contract - Project management platform on Stellar
#[contract]
pub struct ManageHubContract;

#[contractimpl]
impl ManageHubContract {
    /// Initialize contract with admin address (one-time operation)
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth(); // Verify admin authorization
        
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
    }
    
    /// Get the current admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("Contract not initialized"))
    }
    
    /// Check if contract has been initialized
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Admin)
    }
    
  
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ManageHubContract);
        let client = ManageHubContractClient::new(&env, &contract_id);
        
        env.mock_all_auths();
        let admin = Address::generate(&env);
        
        client.initialize(&admin);
        
        assert_eq!(client.get_admin(), admin);
        assert!(client.is_initialized());
    }
    
    #[test]
    #[should_panic(expected = "Contract not initialized")]
    fn test_get_admin_before_init() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ManageHubContract);
        let client = ManageHubContractClient::new(&env, &contract_id);
        
        client.get_admin(); // Should panic
    }
    
    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_double_initialization() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ManageHubContract);
        let client = ManageHubContractClient::new(&env, &contract_id);
        
        env.mock_all_auths();
        
        let admin1 = Address::generate(&env);
        let admin2 = Address::generate(&env);
        
        client.initialize(&admin1);
        client.initialize(&admin2); // Should panic
    }
    
    
    #[test]
    fn test_is_initialized() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ManageHubContract);
        let client = ManageHubContractClient::new(&env, &contract_id);
        
        assert!(!client.is_initialized()); // Before initialization
        
        env.mock_all_auths();
        let admin = Address::generate(&env);
        
        client.initialize(&admin);
        
        assert!(client.is_initialized()); // After initialization
    }
}