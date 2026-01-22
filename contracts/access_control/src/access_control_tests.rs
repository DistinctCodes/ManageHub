use crate::access_control::AccessControlModule;
use crate::errors::AccessControlError;
use crate::types::{AccessControlConfig, ProposalAction, UserRole};
use soroban_sdk::{
    testutils::{Address as _, Events},
    Address, Env, Vec,
};

fn setup_test_env() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    (env, contract_id, admin, user1, user2)
}

fn setup_initialized_env() -> (Env, Address, Address, Address, Address) {
    let (env, contract_id, admin, user1, user2) = setup_test_env();
    env.as_contract(&contract_id, || {
        AccessControlModule::initialize(&env, admin.clone(), None).unwrap();
    });
    (env, contract_id, admin, user1, user2)
}

#[test]
fn test_initialize() {
    let (env, contract_id, admin, _, _) = setup_test_env();

    let result = env.as_contract(&contract_id, || {
        AccessControlModule::initialize(&env, admin.clone(), None)
    });
    assert!(result.is_ok());

    // Check admin role was set
    env.as_contract(&contract_id, || {
        assert_eq!(
            AccessControlModule::get_role(&env, admin.clone()),
            UserRole::Admin
        );
        assert!(AccessControlModule::is_admin(&env, admin.clone()));
        assert!(AccessControlModule::is_initialized(&env));
        assert!(!AccessControlModule::is_paused(&env));
    });
}

#[test]
fn test_initialize_twice_fails() {
    let (env, contract_id, admin, _, _) = setup_test_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::initialize(&env, admin.clone(), None).unwrap();
        let result = AccessControlModule::initialize(&env, admin.clone(), None);
        assert_eq!(result.unwrap_err(), AccessControlError::ConfigurationError);
    });
}

#[test]
fn test_set_role_by_admin() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert!(result.is_ok());

        assert_eq!(AccessControlModule::get_role(&env, user1), UserRole::Member);
    });
}

#[test]
fn test_set_role_by_non_admin_fails() {
    let (env, contract_id, _admin, user1, user2) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result =
            AccessControlModule::set_role(&env, user1.clone(), user2.clone(), UserRole::Member);
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_get_role_default_guest() {
    let (env, contract_id, _admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // User without assigned role should be Guest
        assert_eq!(AccessControlModule::get_role(&env, user1), UserRole::Guest);
    });
}

#[test]
fn test_check_access_hierarchy() {
    let (env, contract_id, admin, user1, user2) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Set roles
        AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member)
            .unwrap();
        AccessControlModule::set_role(&env, admin.clone(), user2.clone(), UserRole::Admin).unwrap();

        // Admin can access everything
        assert!(AccessControlModule::check_access(&env, admin.clone(), UserRole::Guest).unwrap());
        assert!(AccessControlModule::check_access(&env, admin.clone(), UserRole::Member).unwrap());
        assert!(AccessControlModule::check_access(&env, admin.clone(), UserRole::Admin).unwrap());

        // Member can access Guest and Member
        assert!(AccessControlModule::check_access(&env, user1.clone(), UserRole::Guest).unwrap());
        assert!(AccessControlModule::check_access(&env, user1.clone(), UserRole::Member).unwrap());
        assert!(!AccessControlModule::check_access(&env, user1.clone(), UserRole::Admin).unwrap());

        // Guest can only access Guest
        let guest = Address::generate(&env);
        assert!(AccessControlModule::check_access(&env, guest.clone(), UserRole::Guest).unwrap());
        assert!(!AccessControlModule::check_access(&env, guest.clone(), UserRole::Member).unwrap());
        assert!(!AccessControlModule::check_access(&env, guest.clone(), UserRole::Admin).unwrap());
    });
}

#[test]
fn test_require_access() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member)
            .unwrap();

        // Should succeed for valid access
        assert!(AccessControlModule::require_access(&env, user1.clone(), UserRole::Guest).is_ok());
        assert!(AccessControlModule::require_access(&env, user1.clone(), UserRole::Member).is_ok());

        // Should fail for insufficient access
        let result = AccessControlModule::require_access(&env, user1.clone(), UserRole::Admin);
        assert_eq!(result.unwrap_err(), AccessControlError::InsufficientRole);
    });
}

#[test]
fn test_pause_unpause() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Pause contract
        AccessControlModule::pause(&env, admin.clone()).unwrap();
        assert!(AccessControlModule::is_paused(&env));

        // Operations should fail when paused
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert_eq!(result.unwrap_err(), AccessControlError::ContractPaused);

        // Unpause contract
        AccessControlModule::unpause(&env, admin.clone()).unwrap();
        assert!(!AccessControlModule::is_paused(&env));

        // Operations should work again
        assert!(AccessControlModule::set_role(
            &env,
            admin.clone(),
            user1.clone(),
            UserRole::Member
        )
        .is_ok());
    });
}

#[test]
fn test_pause_by_non_admin_fails() {
    let (env, contract_id, _, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result = AccessControlModule::pause(&env, user1.clone());
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_transfer_admin() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::propose_admin_transfer(&env, admin.clone(), user1.clone()).unwrap();
        AccessControlModule::accept_admin_transfer(&env, user1.clone()).unwrap();

        // New admin should have admin role
        assert_eq!(
            AccessControlModule::get_role(&env, user1.clone()),
            UserRole::Admin
        );
        assert!(AccessControlModule::is_admin(&env, user1.clone()));

        // New admin should be able to perform admin operations
        let user2 = Address::generate(&env);
        assert!(AccessControlModule::set_role(
            &env,
            user1.clone(),
            user2.clone(),
            UserRole::Member
        )
        .is_ok());
    });
}

#[test]
fn test_remove_role() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Set role and then remove it
        AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member)
            .unwrap();
        assert_eq!(
            AccessControlModule::get_role(&env, user1.clone()),
            UserRole::Member
        );

        AccessControlModule::remove_role(&env, admin.clone(), user1.clone()).unwrap();
        assert_eq!(
            AccessControlModule::get_role(&env, user1.clone()),
            UserRole::Guest
        );
    });
}

#[test]
fn test_cannot_remove_main_admin_role() {
    let (env, contract_id, admin, _, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result = AccessControlModule::remove_role(&env, admin.clone(), admin.clone());
        assert_eq!(
            result.unwrap_err(),
            AccessControlError::RoleHierarchyViolation
        );
    });
}

#[test]
fn test_operations_on_uninitialized_system_fail() {
    let (env, contract_id, admin, user1, _) = setup_test_env();

    env.as_contract(&contract_id, || {
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert_eq!(result.unwrap_err(), AccessControlError::NotInitialized);

        let result = AccessControlModule::check_access(&env, user1.clone(), UserRole::Guest);
        assert_eq!(result.unwrap_err(), AccessControlError::NotInitialized);
    });
}

#[test]
fn test_config_management() {
    let (env, contract_id, admin, _, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let membership_contract = Address::generate(&env);
        let new_config = AccessControlConfig {
            membership_token_contract: Some(membership_contract.clone()),
            require_membership_for_roles: true,
            min_token_balance: 100,
        };

        AccessControlModule::update_config(&env, admin.clone(), new_config.clone()).unwrap();

        let stored_config = AccessControlModule::get_config(&env);
        assert_eq!(
            stored_config.membership_token_contract,
            Some(membership_contract)
        );
        assert!(stored_config.require_membership_for_roles);
        assert_eq!(stored_config.min_token_balance, 100);
    });
}

// Mock membership token contract for testing
mod mock_membership_token {
    use soroban_sdk::{contract, contractimpl, Address, Env};

    #[contract]
    pub struct MockMembershipToken;

    #[contractimpl]
    impl MockMembershipToken {
        pub fn balance_of(_env: Env, _user: Address) -> i128 {
            // Return a default balance for testing
            1000
        }
    }
}

#[test]
fn test_membership_token_integration() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Deploy mock membership token
        let membership_token_id = env.register(mock_membership_token::MockMembershipToken, ());

        // Configure access control to require membership
        let config = AccessControlConfig {
            membership_token_contract: Some(membership_token_id.clone()),
            require_membership_for_roles: true,
            min_token_balance: 500,
        };

        AccessControlModule::update_config(&env, admin.clone(), config).unwrap();

        // Setting Member role should work (mock returns 1000 tokens)
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert!(result.is_ok());

        // Check access should also work
        let result = AccessControlModule::check_access(&env, user1.clone(), UserRole::Member);
        assert!(result.is_ok());
        assert!(result.unwrap());
    });
}

#[test]
fn test_membership_token_insufficient_balance() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Deploy mock membership token
        let membership_token_id = env.register(mock_membership_token::MockMembershipToken, ());

        // Configure access control to require more tokens than mock provides
        let config = AccessControlConfig {
            membership_token_contract: Some(membership_token_id.clone()),
            require_membership_for_roles: true,
            min_token_balance: 2000, // Mock only returns 1000
        };

        AccessControlModule::update_config(&env, admin.clone(), config).unwrap();

        // Setting Member role should fail due to insufficient tokens
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert_eq!(
            result.unwrap_err(),
            AccessControlError::InsufficientMembership
        );
    });
}

#[test]
fn test_membership_not_required_for_guest_role() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        // Deploy mock membership token
        let membership_token_id = env.register(mock_membership_token::MockMembershipToken, ());

        // Configure access control to require membership
        let config = AccessControlConfig {
            membership_token_contract: Some(membership_token_id.clone()),
            require_membership_for_roles: true,
            min_token_balance: 2000, // More than mock provides
        };

        AccessControlModule::update_config(&env, admin.clone(), config).unwrap();

        // Setting Guest role should work even without sufficient tokens
        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Guest);
        assert!(result.is_ok());

        // Guest access should also work
        let result = AccessControlModule::check_access(&env, user1.clone(), UserRole::Guest);
        assert!(result.is_ok());
        assert!(result.unwrap());
    });
}

#[test]
fn test_config_update_by_non_admin_fails() {
    let (env, contract_id, _, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let config = AccessControlConfig::default();
        let result = AccessControlModule::update_config(&env, user1.clone(), config);
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_blacklist_functionality() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        assert!(!AccessControlModule::is_blacklisted(&env, &user1));

        AccessControlModule::blacklist_user(&env, admin.clone(), user1.clone()).unwrap();
        assert!(AccessControlModule::is_blacklisted(&env, &user1));

        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert_eq!(result.unwrap_err(), AccessControlError::Unauthorized);

        AccessControlModule::unblacklist_user(&env, admin.clone(), user1.clone()).unwrap();
        assert!(!AccessControlModule::is_blacklisted(&env, &user1));

        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert!(result.is_ok());
    });
}

#[test]
fn test_admin_self_removal_prevention() {
    let (env, contract_id, admin, _, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result = AccessControlModule::remove_role(&env, admin.clone(), admin.clone());
        assert_eq!(
            result.unwrap_err(),
            AccessControlError::RoleHierarchyViolation
        );
    });
}

#[test]
fn test_admin_transfer_security() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result =
            AccessControlModule::propose_admin_transfer(&env, admin.clone(), admin.clone());
        assert_eq!(result.unwrap_err(), AccessControlError::InvalidAddress);

        AccessControlModule::propose_admin_transfer(&env, admin.clone(), user1.clone()).unwrap();
        AccessControlModule::accept_admin_transfer(&env, user1.clone()).unwrap();

        assert_eq!(
            AccessControlModule::get_role(&env, user1.clone()),
            UserRole::Admin
        );
        assert_eq!(
            AccessControlModule::get_role(&env, admin.clone()),
            UserRole::Guest
        );

        let result =
            AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member);
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_blacklisted_user_access_denied() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::set_role(&env, admin.clone(), user1.clone(), UserRole::Member)
            .unwrap();
        assert!(AccessControlModule::check_access(&env, user1.clone(), UserRole::Member).unwrap());

        AccessControlModule::blacklist_user(&env, admin.clone(), user1.clone()).unwrap();
        assert!(!AccessControlModule::check_access(&env, user1.clone(), UserRole::Member).unwrap());
        assert!(!AccessControlModule::check_access(&env, user1.clone(), UserRole::Guest).unwrap());
    });
}

#[test]
fn test_non_admin_cannot_blacklist() {
    let (env, contract_id, _, user1, user2) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        let result = AccessControlModule::blacklist_user(&env, user1.clone(), user2.clone());
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_multisig_initialization() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone(), admin3.clone()]);
        let result = AccessControlModule::initialize_multisig(&env, admins, 2, None);
        assert!(result.is_ok());

        assert!(AccessControlModule::is_multisig_enabled(&env));
        let config = AccessControlModule::get_multisig_config(&env).unwrap();
        assert_eq!(config.required_signatures, 2);
        assert_eq!(config.admins.len(), 3);

        assert_eq!(
            AccessControlModule::get_role(&env, admin1.clone()),
            UserRole::Admin
        );
        assert_eq!(
            AccessControlModule::get_role(&env, admin2.clone()),
            UserRole::Admin
        );
        assert_eq!(
            AccessControlModule::get_role(&env, admin3.clone()),
            UserRole::Admin
        );
    });
}

#[test]
fn test_multisig_proposal_creation_and_approval() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);
    let user = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone(), admin3.clone()]);
        AccessControlModule::initialize_multisig(&env, admins, 2, None).unwrap();

        let action = ProposalAction::SetRole(user.clone(), UserRole::Member);
        let proposal_id =
            AccessControlModule::create_proposal(&env, admin1.clone(), action).unwrap();

        AccessControlModule::approve_proposal(&env, admin2.clone(), proposal_id).unwrap();

        assert_eq!(
            AccessControlModule::get_role(&env, user.clone()),
            UserRole::Member
        );
    });
}

#[test]
fn test_two_step_admin_transfer() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::propose_admin_transfer(&env, admin.clone(), user1.clone()).unwrap();

        let pending = AccessControlModule::get_pending_admin_transfer(&env).unwrap();
        assert_eq!(pending.proposed_admin, user1);
        assert_eq!(pending.proposer, admin);

        AccessControlModule::accept_admin_transfer(&env, user1.clone()).unwrap();

        assert_eq!(
            AccessControlModule::get_role(&env, user1.clone()),
            UserRole::Admin
        );
        assert_eq!(
            AccessControlModule::get_role(&env, admin.clone()),
            UserRole::Guest
        );
        assert!(AccessControlModule::get_pending_admin_transfer(&env).is_none());
    });
}

#[test]
fn test_admin_transfer_cancellation() {
    let (env, contract_id, admin, user1, _) = setup_initialized_env();

    env.as_contract(&contract_id, || {
        AccessControlModule::propose_admin_transfer(&env, admin.clone(), user1.clone()).unwrap();

        assert!(AccessControlModule::get_pending_admin_transfer(&env).is_some());

        AccessControlModule::cancel_admin_transfer(&env, admin.clone()).unwrap();

        assert!(AccessControlModule::get_pending_admin_transfer(&env).is_none());
        assert_eq!(
            AccessControlModule::get_role(&env, admin.clone()),
            UserRole::Admin
        );
    });
}

#[test]
fn test_multisig_prevents_direct_operations() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone()]);
        AccessControlModule::initialize_multisig(&env, admins, 2, None).unwrap();

        let config = AccessControlConfig::default();
        let result = AccessControlModule::update_config(&env, admin1.clone(), config);
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);

        let result = AccessControlModule::pause(&env, admin1.clone());
        assert_eq!(result.unwrap_err(), AccessControlError::AdminRequired);
    });
}

#[test]
fn test_insufficient_multisig_approvals() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let admin3 = Address::generate(&env);
    let user = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone(), admin3.clone()]);
        AccessControlModule::initialize_multisig(&env, admins, 3, None).unwrap();

        let action = ProposalAction::SetRole(user.clone(), UserRole::Member);
        let proposal_id =
            AccessControlModule::create_proposal(&env, admin1.clone(), action).unwrap();

        AccessControlModule::approve_proposal(&env, admin2.clone(), proposal_id).unwrap();

        assert_eq!(
            AccessControlModule::get_role(&env, user.clone()),
            UserRole::Guest
        );

        AccessControlModule::approve_proposal(&env, admin3.clone(), proposal_id).unwrap();

        assert_eq!(
            AccessControlModule::get_role(&env, user.clone()),
            UserRole::Member
        );
    });
}

// ==================== Event Emission Tests ====================

#[test]
fn test_initialize_event_emitted() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin = Address::generate(&env);

    env.as_contract(&contract_id, || {
        AccessControlModule::initialize(&env, admin.clone(), None).unwrap();
    });

    // Verify events were emitted
    let events = env.events().all();
    assert!(events.len() > 0, "Initialization event should be emitted");
}

#[test]
fn test_initialize_multisig_event_emitted() {
    let env = Env::default();
    let contract_id = env.register(crate::AccessControl, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);

    env.as_contract(&contract_id, || {
        let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone()]);
        AccessControlModule::initialize_multisig(&env, admins, 2, None).unwrap();
    });

    // Verify events were emitted
    let events = env.events().all();
    assert!(
        events.len() > 0,
        "Multisig initialization event should be emitted"
    );
}

#[test]
fn test_set_role_event_emitted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(crate::AccessControl, ());
    let client = crate::AccessControlClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);

    client.initialize(&admin);
    client.set_role(&admin, &user1, &UserRole::Member);

    // Verify role was set
    let role = client.get_role(&user1);
    assert_eq!(
        role,
        UserRole::Member,
        "Role should have been set to Member"
    );
}

#[test]
fn test_pause_unpause_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(crate::AccessControl, ());
    let client = crate::AccessControlClient::new(&env, &contract_id);
    let admin = Address::generate(&env);

    client.initialize(&admin);
    client.pause(&admin);

    // Verify contract is paused
    assert!(env.as_contract(&contract_id, || { AccessControlModule::is_paused(&env) }));

    client.unpause(&admin);

    // Verify contract is unpaused
    assert!(!env.as_contract(&contract_id, || { AccessControlModule::is_paused(&env) }));
}

#[test]
fn test_admin_transfer_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(crate::AccessControl, ());
    let client = crate::AccessControlClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);

    client.initialize(&admin);
    client.propose_admin_transfer(&admin, &user1);

    // Verify proposal was created
    client.accept_admin_transfer(&user1);

    // Verify admin was transferred
    assert!(client.is_admin(&user1));
}

#[test]
fn test_proposal_events_emitted() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(crate::AccessControl, ());
    let client = crate::AccessControlClient::new(&env, &contract_id);
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);

    let admins = Vec::from_array(&env, [admin1.clone(), admin2.clone()]);
    client.initialize_multisig(&admins, &2);

    let action = ProposalAction::SetRole(user.clone(), UserRole::Member);
    let proposal_id = client.create_proposal(&admin1, &action);

    // Approve proposal
    client.approve_proposal(&admin2, &proposal_id);

    // Verify role was set after approval
    assert_eq!(client.get_role(&user), UserRole::Member);
}
