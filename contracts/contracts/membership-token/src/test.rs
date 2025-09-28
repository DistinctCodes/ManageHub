#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let access_control_addr = Address::generate(&env);
    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    client.initialize(&name, &symbol, &decimals, &access_control_addr);

    let token_info = client.token_info();
    assert_eq!(token_info.name, name);
    assert_eq!(token_info.symbol, symbol);
    assert_eq!(token_info.decimals, decimals);
    assert_eq!(token_info.total_supply, 0);
}

#[test]
fn test_balance_of() {
    let env = Env::default();
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let balance = client.balance_of(&user);
    assert_eq!(balance, 0);
}

#[test]
fn test_allowance() {
    let env = Env::default();
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let allowance = client.allowance(&owner, &spender);
    assert_eq!(allowance, 0);
}

#[test]
fn test_approve() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let amount = 1000i128;

    env.mock_all_auths();
    let result = client.try_approve(&owner, &spender, &amount);
    assert!(result.is_ok());

    let allowance = client.allowance(&owner, &spender);
    assert_eq!(allowance, amount);
}

mod access_control_mock {
    use soroban_sdk::{contract, contractimpl, Env, String};
    use super::access_control_interface::{QueryMsg, AccessResponse};

    #[contract]
    pub struct MockAccessControl;

    #[contractimpl]
    impl MockAccessControl {
        pub fn check_access(env: Env, query: QueryMsg) -> AccessResponse {
            // For testing purposes, only grant access to Minter role
            // Removed Transferer role for security
            let required_role = query.check_access.required_role;
            let has_access = required_role == String::from_str(&env, "Minter");
            AccessResponse { has_access }
        }
    }
}

#[test]
fn test_mint_with_access_control() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy access control mock
    let access_control_id = env.register(access_control_mock::MockAccessControl, ());

    // Deploy token contract
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    // Initialize with mock access control
    client.initialize(&name, &symbol, &decimals, &access_control_id);

    let to = Address::generate(&env);
    let amount = 1000i128;

    // This should work because our mock grants access to "Minter" role
    let minter = Address::generate(&env);
    let result = client.try_mint(&minter, &to, &amount);
    assert!(result.is_ok());

    let balance = client.balance_of(&to);
    assert_eq!(balance, amount);

    let total_supply = client.total_supply();
    assert_eq!(total_supply, amount);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy access control mock
    let access_control_id = env.register(access_control_mock::MockAccessControl, ());

    // Deploy token contract
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    // Initialize with mock access control
    client.initialize(&name, &symbol, &decimals, &access_control_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let amount = 1000i128;

    // First mint tokens to from address
    let minter = Address::generate(&env);
    client.mint(&minter, &from, &amount);

    // Transfer tokens
    let result = client.try_transfer(&from, &from, &to, &(amount / 2));
    assert!(result.is_ok());

    let from_balance = client.balance_of(&from);
    let to_balance = client.balance_of(&to);
    assert_eq!(from_balance, amount / 2);
    assert_eq!(to_balance, amount / 2);
}

#[test]
fn test_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy access control mock
    let access_control_id = env.register(access_control_mock::MockAccessControl, ());

    // Deploy token contract
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    // Initialize with mock access control
    client.initialize(&name, &symbol, &decimals, &access_control_id);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let to = Address::generate(&env);
    let amount = 1000i128;

    // First mint tokens to owner
    let minter = Address::generate(&env);
    client.mint(&minter, &owner, &amount);

    // Owner approves spender
    client.approve(&owner, &spender, &amount);

    // Spender transfers on behalf of owner
    let result = client.try_transfer_from(&spender, &owner, &to, &(amount / 2));
    assert!(result.is_ok());

    let owner_balance = client.balance_of(&owner);
    let to_balance = client.balance_of(&to);
    let remaining_allowance = client.allowance(&owner, &spender);

    assert_eq!(owner_balance, amount / 2);
    assert_eq!(to_balance, amount / 2);
    assert_eq!(remaining_allowance, amount / 2);
}

#[test]
fn test_transfer_owner_only() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy access control mock
    let access_control_id = env.register(access_control_mock::MockAccessControl, ());

    // Deploy token contract
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    // Initialize with mock access control
    client.initialize(&name, &symbol, &decimals, &access_control_id);

    let from = Address::generate(&env);
    let to = Address::generate(&env);
    let unauthorized = Address::generate(&env);
    let amount = 1000i128;

    // First mint tokens to from address
    let minter = Address::generate(&env);
    client.mint(&minter, &from, &amount);

    // Owner can transfer their own tokens
    client.transfer(&from, &from, &to, &500i128);
    assert_eq!(client.balance_of(&from), 500i128);
    assert_eq!(client.balance_of(&to), 500i128);

    // Unauthorized user cannot transfer others' tokens
    let result = client.try_transfer(&unauthorized, &from, &to, &100i128);
    assert!(result.is_err());
}

#[test]
fn test_transfer_from_with_allowance() {
    let env = Env::default();
    env.mock_all_auths();

    // Deploy access control mock
    let access_control_id = env.register(access_control_mock::MockAccessControl, ());

    // Deploy token contract
    let contract_id = env.register(MembershipToken, ());
    let client = MembershipTokenClient::new(&env, &contract_id);

    let name = String::from_str(&env, "ManageHub Token");
    let symbol = String::from_str(&env, "MHT");
    let decimals = 8u32;

    // Initialize with mock access control
    client.initialize(&name, &symbol, &decimals, &access_control_id);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let to = Address::generate(&env);
    let amount = 1000i128;

    // Mint tokens to owner
    let minter = Address::generate(&env);
    client.mint(&minter, &owner, &amount);

    // Owner approves spender
    client.approve(&owner, &spender, &500i128);

    // Spender can transfer from owner's account
    client.transfer_from(&spender, &owner, &to, &300i128);
    
    assert_eq!(client.balance_of(&owner), 700i128);
    assert_eq!(client.balance_of(&to), 300i128);
    assert_eq!(client.allowance(&owner, &spender), 200i128);
}
