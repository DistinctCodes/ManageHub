#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, CredentialBadgeContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CredentialBadgeContract, ());
    let client = CredentialBadgeContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin).unwrap();
    (env, client, admin)
}

fn badge_id(env: &Env, s: &str) -> String {
    String::from_str(env, s)
}

// ── register_badge_type ───────────────────────────────────────────────────────

#[test]
fn test_register_badge_type_success() {
    let (env, client, admin) = setup();
    client
        .register_badge_type(&admin, &badge_id(&env, "RUST101"), &badge_id(&env, "Rust Basics"))
        .unwrap();
    let bt = client.get_badge_type(&badge_id(&env, "RUST101")).unwrap();
    assert_eq!(bt.id, badge_id(&env, "RUST101"));
    assert_eq!(bt.name, badge_id(&env, "Rust Basics"));
}

#[test]
fn test_register_badge_type_duplicate_rejected() {
    let (env, client, admin) = setup();
    client
        .register_badge_type(&admin, &badge_id(&env, "DUP"), &badge_id(&env, "Dup Badge"))
        .unwrap();
    let err = client
        .try_register_badge_type(&admin, &badge_id(&env, "DUP"), &badge_id(&env, "Dup Badge"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::BadgeTypeAlreadyExists);
}

// ── issue_credential ──────────────────────────────────────────────────────────

#[test]
fn test_issue_credential_success() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "B1"), &badge_id(&env, "Badge One"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "B1"), &holder)
        .unwrap();
    let cred = client
        .get_credential(&badge_id(&env, "B1"), &holder)
        .unwrap();
    assert_eq!(cred.holder, holder);
    assert!(!cred.revoked);
}

#[test]
fn test_issue_credential_duplicate_rejected() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "B2"), &badge_id(&env, "Badge Two"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "B2"), &holder)
        .unwrap();
    let err = client
        .try_issue_credential(&admin, &badge_id(&env, "B2"), &holder)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::CredentialAlreadyIssued);
}

#[test]
fn test_issue_credential_nonexistent_badge_type_rejected() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    let err = client
        .try_issue_credential(&admin, &badge_id(&env, "GHOST"), &holder)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::BadgeTypeNotFound);
}

// ── revoke_credential ─────────────────────────────────────────────────────────

#[test]
fn test_revoke_credential_marks_revoked() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "B3"), &badge_id(&env, "Badge Three"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "B3"), &holder)
        .unwrap();
    client
        .revoke_credential(&admin, &badge_id(&env, "B3"), &holder)
        .unwrap();
    let cred = client
        .get_credential(&badge_id(&env, "B3"), &holder)
        .unwrap();
    assert!(cred.revoked);
}

// ── verify_credential ─────────────────────────────────────────────────────────

#[test]
fn test_verify_credential_true_for_valid() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "B4"), &badge_id(&env, "Badge Four"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "B4"), &holder)
        .unwrap();
    assert!(client.verify_credential(&badge_id(&env, "B4"), &holder));
}

#[test]
fn test_verify_credential_false_for_revoked() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "B5"), &badge_id(&env, "Badge Five"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "B5"), &holder)
        .unwrap();
    client
        .revoke_credential(&admin, &badge_id(&env, "B5"), &holder)
        .unwrap();
    assert!(!client.verify_credential(&badge_id(&env, "B5"), &holder));
}

#[test]
fn test_verify_credential_false_for_nonexistent() {
    let (env, client, _admin) = setup();
    let holder = Address::generate(&env);
    assert!(!client.verify_credential(&badge_id(&env, "NONE"), &holder));
}

// ── get_holder_credentials ────────────────────────────────────────────────────

#[test]
fn test_get_holder_credentials_lists_all() {
    let (env, client, admin) = setup();
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "X1"), &badge_id(&env, "X One"))
        .unwrap();
    client
        .register_badge_type(&admin, &badge_id(&env, "X2"), &badge_id(&env, "X Two"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "X1"), &holder)
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "X2"), &holder)
        .unwrap();
    let creds = client.get_holder_credentials(&holder);
    assert_eq!(creds.len(), 2);
}

#[test]
fn test_get_holder_credentials_empty_for_new_holder() {
    let (env, client, _admin) = setup();
    let holder = Address::generate(&env);
    let creds = client.get_holder_credentials(&holder);
    assert_eq!(creds.len(), 0);
}

// ── get_all_badge_types ───────────────────────────────────────────────────────

#[test]
fn test_get_all_badge_types_returns_all() {
    let (env, client, admin) = setup();
    client
        .register_badge_type(&admin, &badge_id(&env, "T1"), &badge_id(&env, "Type One"))
        .unwrap();
    client
        .register_badge_type(&admin, &badge_id(&env, "T2"), &badge_id(&env, "Type Two"))
        .unwrap();
    let types = client.get_all_badge_types();
    assert_eq!(types.len(), 2);
}

#[test]
fn test_get_all_badge_types_empty_initially() {
    let (_env, client, _admin) = setup();
    let types = client.get_all_badge_types();
    assert_eq!(types.len(), 0);
}

// ── access control ────────────────────────────────────────────────────────────

#[test]
fn test_non_admin_cannot_register_badge_type() {
    let (env, client, _admin) = setup();
    let non_admin = Address::generate(&env);
    let err = client
        .try_register_badge_type(
            &non_admin,
            &badge_id(&env, "NA1"),
            &badge_id(&env, "No Access"),
        )
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_non_admin_cannot_issue_credential() {
    let (env, client, admin) = setup();
    let non_admin = Address::generate(&env);
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "NA2"), &badge_id(&env, "Badge"))
        .unwrap();
    let err = client
        .try_issue_credential(&non_admin, &badge_id(&env, "NA2"), &holder)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}

#[test]
fn test_non_admin_cannot_revoke_credential() {
    let (env, client, admin) = setup();
    let non_admin = Address::generate(&env);
    let holder = Address::generate(&env);
    client
        .register_badge_type(&admin, &badge_id(&env, "NA3"), &badge_id(&env, "Badge"))
        .unwrap();
    client
        .issue_credential(&admin, &badge_id(&env, "NA3"), &holder)
        .unwrap();
    let err = client
        .try_revoke_credential(&non_admin, &badge_id(&env, "NA3"), &holder)
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::Unauthorized);
}
