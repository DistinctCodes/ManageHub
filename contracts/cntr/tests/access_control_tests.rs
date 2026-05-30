use cntr::role_checker::RoleRegistry;

#[test]
fn test_grant_role_to_new_address() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("alice", "Admin");
    assert!(reg.has_role("alice", "Admin"));
}

#[test]
fn test_grant_same_role_twice_is_idempotent() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("alice", "Admin");
    reg.grant_role("alice", "Admin");
    let roles = reg.get_roles("alice");
    assert_eq!(roles.iter().filter(|r| *r == "Admin").count(), 1);
}

#[test]
fn test_grant_two_different_roles_to_same_address() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("alice", "Admin");
    reg.grant_role("alice", "Member");
    assert!(reg.has_role("alice", "Admin"));
    assert!(reg.has_role("alice", "Member"));
}

#[test]
fn test_revoke_existing_role() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("alice", "Admin");
    reg.revoke_role("alice", "Admin");
    assert!(!reg.has_role("alice", "Admin"));
}

#[test]
fn test_revoke_nonexistent_role_does_not_panic() {
    let mut reg = RoleRegistry::new();
    reg.revoke_role("alice", "Admin"); // should not panic
}

#[test]
fn test_has_role_for_unknown_address_returns_false() {
    let reg = RoleRegistry::new();
    assert!(!reg.has_role("unknown", "Admin"));
}

#[test]
fn test_get_all_roles_for_multi_role_holder() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("bob", "Admin");
    reg.grant_role("bob", "Member");
    reg.grant_role("bob", "Auditor");
    let roles = reg.get_roles("bob");
    assert_eq!(roles.len(), 3);
    assert!(roles.contains(&"Admin".to_string()));
    assert!(roles.contains(&"Member".to_string()));
    assert!(roles.contains(&"Auditor".to_string()));
}

#[test]
fn test_has_role_with_empty_registry() {
    let reg = RoleRegistry::new();
    assert!(!reg.has_role("alice", "Member"));
}

#[test]
fn test_revoke_one_role_leaves_others_intact() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("carol", "Admin");
    reg.grant_role("carol", "Member");
    reg.revoke_role("carol", "Admin");
    assert!(!reg.has_role("carol", "Admin"));
    assert!(reg.has_role("carol", "Member"));
}

#[test]
fn test_multiple_addresses_independent() {
    let mut reg = RoleRegistry::new();
    reg.grant_role("alice", "Admin");
    reg.grant_role("bob", "Member");
    assert!(reg.has_role("alice", "Admin"));
    assert!(!reg.has_role("alice", "Member"));
    assert!(reg.has_role("bob", "Member"));
    assert!(!reg.has_role("bob", "Admin"));
}

#[test]
fn test_get_roles_returns_empty_for_unknown_address() {
    let reg = RoleRegistry::new();
    assert!(reg.get_roles("nobody").is_empty());
}

#[test]
fn test_revoke_from_unknown_address_does_not_panic() {
    let mut reg = RoleRegistry::new();
    reg.revoke_role("ghost", "Admin"); // should not panic
}
