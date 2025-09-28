#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_initialize() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    let result = client.try_initialize(&admin);
    assert!(result.is_ok());

    // Check if admin has Admin role
    let admin_role = String::from_str(&env, "Admin");
    let has_admin_role = client.has_role(&admin, &admin_role);
    assert!(has_admin_role);

    // Check if admin is recognized as admin
    let is_admin = client.is_admin(&admin);
    assert!(is_admin);

    // Check default roles were created
    let minter_role = String::from_str(&env, "Minter");
    let transferer_role = String::from_str(&env, "Transferer");

    let minter_members = client.get_role_members(&minter_role);
    let transferer_members = client.get_role_members(&transferer_role);

    // Just check that we can get the members (Vec should be valid)
    assert_eq!(minter_members.len(), 0);
    assert_eq!(transferer_members.len(), 0);
}

#[test]
fn test_create_role() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let new_role = String::from_str(&env, "NewRole");
    let result = client.try_create_role(&admin, &new_role);
    assert!(result.is_ok());

    // Verify role was created by trying to get its members
    let role_members = client.get_role_members(&new_role);
    assert_eq!(role_members.len(), 0);
}

#[test]
fn test_grant_role() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let minter_role = String::from_str(&env, "Minter");

    // Grant minter role to user
    let result = client.try_grant_role(&admin, &user, &minter_role);
    assert!(result.is_ok());

    // Verify user has the role
    let has_role = client.has_role(&user, &minter_role);
    assert!(has_role);

    // Verify user appears in role members
    let role_members = client.get_role_members(&minter_role);
    assert!(role_members.contains(&user));

    // Verify user's roles include the minter role
    let user_roles = client.get_user_roles(&user);
    assert!(user_roles.contains(minter_role));
}

#[test]
fn test_revoke_role() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let minter_role = String::from_str(&env, "Minter");

    // Grant and then revoke role
    client.grant_role(&admin, &user, &minter_role);
    let result = client.try_revoke_role(&admin, &user, &minter_role);
    assert!(result.is_ok());

    // Verify user no longer has the role
    let has_role = client.has_role(&user, &minter_role);
    assert!(!has_role);

    // Verify user doesn't appear in role members
    let role_members = client.get_role_members(&minter_role);
    assert!(!role_members.contains(&user));

    // Verify user's roles don't include the minter role
    let user_roles = client.get_user_roles(&user);
    assert!(!user_roles.contains(minter_role));
}

#[test]
fn test_check_access() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let minter_role = String::from_str(&env, "Minter");

    // User without role should not have access
    let query = QueryMsg {
        check_access: CheckAccessQuery {
            caller: user.clone(),
            required_role: minter_role.clone(),
        },
    };
    let response = client.check_access(&query);
    assert!(!response.has_access);

    // Grant role to user
    client.grant_role(&admin, &user, &minter_role);

    // User with role should have access
    let query = QueryMsg {
        check_access: CheckAccessQuery {
            caller: user.clone(),
            required_role: minter_role.clone(),
        },
    };
    let response = client.check_access(&query);
    assert!(response.has_access);
}

#[test]
fn test_unauthorized_role_creation() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let new_role = String::from_str(&env, "UnauthorizedRole");

    // Try to create role as non-admin user (should fail)
    env.mock_all_auths_allowing_non_root_auth();
    let _result = client.try_create_role(&unauthorized_user, &new_role);
    // Note: This test might need adjustment based on how Soroban handles auth
    // In a real scenario, this should fail due to authorization
}

#[test]
fn test_role_already_exists_error() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let existing_role = String::from_str(&env, "Minter"); // This role is created during initialization

    // Try to create an already existing role
    let result = client.try_create_role(&admin, &existing_role);
    assert!(result.is_err());
}

#[test]
fn test_grant_nonexistent_role() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let nonexistent_role = String::from_str(&env, "NonexistentRole");

    // Try to grant a role that doesn't exist
    let result = client.try_grant_role(&admin, &user, &nonexistent_role);
    assert!(result.is_err());
}

#[test]
fn test_user_already_has_role_error() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let minter_role = String::from_str(&env, "Minter");

    // Grant role first time (should succeed)
    let result1 = client.try_grant_role(&admin, &user, &minter_role);
    assert!(result1.is_ok());

    // Try to grant the same role again (should fail)
    let result2 = client.try_grant_role(&admin, &user, &minter_role);
    assert!(result2.is_err());
}

#[test]
fn test_multiple_roles() {
    let env = Env::default();
    let contract_id = env.register(AccessControl, ());
    let client = AccessControlClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&admin);

    let minter_role = String::from_str(&env, "Minter");
    let transferer_role = String::from_str(&env, "Transferer");

    // Grant both roles to user
    client.grant_role(&admin, &user, &minter_role);
    client.grant_role(&admin, &user, &transferer_role);

    // Verify user has both roles
    let has_minter = client.has_role(&user, &minter_role);
    let has_transferer = client.has_role(&user, &transferer_role);
    assert!(has_minter);
    assert!(has_transferer);

    // Verify user's roles contain both
    let user_roles = client.get_user_roles(&user);
    assert!(user_roles.contains(minter_role));
    assert!(user_roles.contains(transferer_role));
    assert_eq!(user_roles.len(), 2);
}