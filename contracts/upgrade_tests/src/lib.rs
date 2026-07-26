#![cfg(test)]

extern crate alloc;

use manage_hub::types::{MembershipStatus, UpgradeConfig};
use manage_hub::Contract;
use manage_hub::ContractClient;
use soroban_sdk::{
    testutils::{Address as _, BytesN as BytesNTestUtils, Ledger as LedgerTestUtils},
    Address, BytesN, Env, String,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn setup() -> (Env, ContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);

    client.set_admin(&admin);

    let config = UpgradeConfig {
        upgrades_enabled: true,
        admin_only: true,
        max_rollbacks: 2,
    };
    client.set_upgrade_config(&admin, &config);

    (env, client, admin)
}

fn issue_test_token(client: &ContractClient, _admin: &Address, user: &Address) -> BytesN<32> {
    let token_id = BytesN::<32>::random(&client.env);
    let expiry = client.env.ledger().timestamp() + 86_400 * 365;
    client.issue_token(&token_id, user, &expiry);
    token_id
}

// ── Upgrade Tests ─────────────────────────────────────────────────────────────

#[test]
fn test_upgrade_token_preserves_state() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let version = client.get_token_version(&token_id);
    assert_eq!(version, 0);

    let new_version = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );
    assert_eq!(new_version, 1);

    let version = client.get_token_version(&token_id);
    assert_eq!(version, 1);

    let token = client.get_token(&token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.current_version, 1);
    assert_eq!(token.status, MembershipStatus::Active);
}

#[test]
fn test_upgrade_token_updates_expiry() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let new_expiry = env.ledger().timestamp() + 86_400 * 730;

    let new_version = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1-renewed")),
        &Some(new_expiry),
        &None,
        &None,
    );
    assert_eq!(new_version, 1);

    let token = client.get_token(&token_id);
    assert_eq!(token.expiry_date, new_expiry);
}

#[test]
fn test_upgrade_token_updates_tier() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let new_tier = String::from_str(&env, "gold");

    let new_version = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v2-gold")),
        &None,
        &Some(new_tier.clone()),
        &None,
    );
    assert_eq!(new_version, 1);

    let token = client.get_token(&token_id);
    assert_eq!(token.tier_id, Some(new_tier));
}

#[test]
fn test_upgrade_token_updates_status() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let new_version = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1-paused")),
        &None,
        &None,
        &Some(MembershipStatus::Expired),
    );
    assert_eq!(new_version, 1);

    let token = client.get_token(&token_id);
    assert_eq!(token.status, MembershipStatus::Expired);
}

#[test]
fn test_multiple_upgrades_increment_version() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let v1 = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );
    assert_eq!(v1, 1);

    let v2 = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v2")),
        &None,
        &None,
        &None,
    );
    assert_eq!(v2, 2);

    let v3 = client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v3")),
        &None,
        &None,
        &None,
    );
    assert_eq!(v3, 3);

    let version = client.get_token_version(&token_id);
    assert_eq!(version, 3);
}

#[test]
fn test_upgrade_history_recorded() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v2")),
        &None,
        &None,
        &None,
    );

    let history = client.get_upgrade_history(&token_id);
    assert_eq!(history.len(), 2);

    let record_1 = history.get(0).unwrap();
    assert_eq!(record_1.from_version, 0);
    assert_eq!(record_1.to_version, 1);
    assert_eq!(record_1.is_rollback, false);

    let record_2 = history.get(1).unwrap();
    assert_eq!(record_2.from_version, 1);
    assert_eq!(record_2.to_version, 2);
    assert_eq!(record_2.is_rollback, false);
}

// ── Rollback Tests ────────────────────────────────────────────────────────────

#[test]
fn test_rollback_to_previous_version() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    // Get original expiry for later comparison
    let original_expiry = client.get_token(&token_id).expiry_date;

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );

    let new_expiry = env.ledger().timestamp() + 86_400 * 730;
    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v2")),
        &Some(new_expiry),
        &None,
        &None,
    );

    let token_after_v2 = client.get_token(&token_id);
    assert_eq!(token_after_v2.current_version, 2);
    assert_eq!(token_after_v2.expiry_date, new_expiry);

    let rollback_version = client.rollback_token_upgrade(&admin, &token_id, &0);
    assert_eq!(rollback_version, 3);

    let token_after_rollback = client.get_token(&token_id);
    assert_eq!(token_after_rollback.current_version, 3);
    assert_eq!(token_after_rollback.expiry_date, original_expiry);
}

#[test]
fn test_rollback_limit_enforced() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );
    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v2")),
        &None,
        &None,
        &None,
    );

    // First rollback (max_rollbacks = 2)
    client.rollback_token_upgrade(&admin, &token_id, &0);

    // Second rollback
    client.rollback_token_upgrade(&admin, &token_id, &0);

    // Third rollback should fail
    let result = client.try_rollback_token_upgrade(&admin, &token_id, &0);
    assert!(result.is_err());
}

#[test]
fn test_rollback_records_in_history() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    client.upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );

    client.rollback_token_upgrade(&admin, &token_id, &0);

    let history = client.get_upgrade_history(&token_id);
    assert_eq!(history.len(), 2);

    let rollback_record = history.get(1).unwrap();
    assert_eq!(rollback_record.is_rollback, true);
    assert_eq!(rollback_record.from_version, 1);
    assert_eq!(rollback_record.to_version, 2);
}

// ── Batch Upgrade Tests ──────────────────────────────────────────────────────

#[test]
fn test_batch_upgrade_tokens() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id_1 = issue_test_token(&client, &admin, &user);
    let token_id_2 = issue_test_token(&client, &admin, &user);

    let mut token_ids = soroban_sdk::Vec::new(&env);
    token_ids.push_back(token_id_1.clone());
    token_ids.push_back(token_id_2.clone());

    let results = client.batch_upgrade_tokens(
        &admin,
        &token_ids,
        &Some(String::from_str(&env, "batch-v1")),
        &None,
    );

    assert_eq!(results.len(), 2);

    let r1 = results.get(0).unwrap();
    assert_eq!(r1.success, true);
    assert_eq!(r1.new_version, Some(1));

    let r2 = results.get(1).unwrap();
    assert_eq!(r2.success, true);
    assert_eq!(r2.new_version, Some(1));

    assert_eq!(client.get_token_version(&token_id_1), 1);
    assert_eq!(client.get_token_version(&token_id_2), 1);
}

#[test]
fn test_batch_upgrade_partial_failure() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id_1 = issue_test_token(&client, &admin, &user);
    let non_existent = BytesN::<32>::random(&env);

    let mut token_ids = soroban_sdk::Vec::new(&env);
    token_ids.push_back(token_id_1.clone());
    token_ids.push_back(non_existent.clone());

    let results = client.batch_upgrade_tokens(
        &admin,
        &token_ids,
        &Some(String::from_str(&env, "batch-v1")),
        &None,
    );

    assert_eq!(results.len(), 2);

    let r1 = results.get(0).unwrap();
    assert_eq!(r1.success, true);

    let r2 = results.get(1).unwrap();
    assert_eq!(r2.success, false);
    assert_eq!(r2.new_version, None);
}

// ── Upgrade Config Tests ─────────────────────────────────────────────────────

#[test]
fn test_set_upgrade_config() {
    let (env, client, admin) = setup();

    let config = client.get_upgrade_config();
    assert_eq!(config.upgrades_enabled, true);
    assert_eq!(config.admin_only, true);
    assert_eq!(config.max_rollbacks, 2);

    let new_config = UpgradeConfig {
        upgrades_enabled: false,
        admin_only: false,
        max_rollbacks: 0,
    };
    client.set_upgrade_config(&admin, &new_config);

    let config = client.get_upgrade_config();
    assert_eq!(config.upgrades_enabled, false);
    assert_eq!(config.admin_only, false);
    assert_eq!(config.max_rollbacks, 0);
}

#[test]
fn test_upgrade_disabled_blocks_upgrade() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    let config = UpgradeConfig {
        upgrades_enabled: false,
        admin_only: true,
        max_rollbacks: 0,
    };
    client.set_upgrade_config(&admin, &config);

    let result = client.try_upgrade_token(
        &admin,
        &token_id,
        &Some(String::from_str(&env, "v1")),
        &None,
        &None,
        &None,
    );
    assert!(result.is_err());
}

// ── Two-Step Admin Transfer Tests ─────────────────────────────────────────────

#[test]
fn test_two_step_admin_transfer() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);

    // Step 1: Propose transfer
    client.propose_admin_transfer(&admin, &new_admin);

    let pending = client.get_pending_admin_transfer();
    assert!(pending.is_some());
    let pending = pending.unwrap();
    assert_eq!(pending.proposed_admin, new_admin);
    assert_eq!(pending.proposer, admin);

    // Step 2: New admin accepts
    client.accept_admin_transfer(&new_admin);

    let pending = client.get_pending_admin_transfer();
    assert!(pending.is_none());

    // Admin should be new_admin now (verify via propose which requires auth)
    // We can't query admin directly since there's no getter; verify the transfer completed
    // by ensuring the old admin can no longer rotate
    let result = client.try_rotate_admin_key(&admin, &Address::generate(&env));
    assert!(result.is_err());
}

#[test]
fn test_cancel_admin_transfer() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);

    client.propose_admin_transfer(&admin, &new_admin);

    let pending = client.get_pending_admin_transfer();
    assert!(pending.is_some());

    client.cancel_admin_transfer(&admin);

    let pending = client.get_pending_admin_transfer();
    assert!(pending.is_none());
}

#[test]
fn test_admin_transfer_only_admin_can_propose() {
    let (env, client, _admin) = setup();

    let attacker = Address::generate(&env);
    let new_admin = Address::generate(&env);

    let result = client.try_propose_admin_transfer(&attacker, &new_admin);
    assert!(result.is_err());
}

#[test]
fn test_admin_transfer_non_admin_cannot_accept() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);
    let attacker = Address::generate(&env);

    client.propose_admin_transfer(&admin, &new_admin);

    let result = client.try_accept_admin_transfer(&attacker);
    assert!(result.is_err());
}

#[test]
fn test_admin_transfer_expiry() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);

    client.propose_admin_transfer(&admin, &new_admin);

    env.ledger().set_timestamp(env.ledger().timestamp() + 86_401);

    let result = client.try_accept_admin_transfer(&new_admin);
    assert!(result.is_err());
}

// ── Admin Key Rotation Tests ─────────────────────────────────────────────────

#[test]
fn test_rotate_admin_key() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);

    client.rotate_admin_key(&admin, &new_admin);

    // Old admin should no longer be authorized to rotate
    let result = client.try_rotate_admin_key(&admin, &Address::generate(&env));
    assert!(result.is_err());

    // New admin should be authorized
    let another_admin = Address::generate(&env);
    client.rotate_admin_key(&new_admin, &another_admin);
}

#[test]
fn test_rotate_admin_key_old_key_no_longer_valid() {
    let (env, client, admin) = setup();

    let new_admin = Address::generate(&env);

    client.rotate_admin_key(&admin, &new_admin);

    let result = client.try_rotate_admin_key(&admin, &Address::generate(&env));
    assert!(result.is_err());
}

// ── Pause Coverage Tests ─────────────────────────────────────────────────────

#[test]
fn test_pause_blocks_issue_token() {
    let (env, client, admin) = setup();

    client.emergency_pause(&admin, &None, &None, &None);

    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 86_400;

    let result = client.try_issue_token(&token_id, &user, &expiry);
    assert!(result.is_err());
}

#[test]
fn test_pause_blocks_transfer_token() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    client.emergency_pause(&admin, &None, &None, &None);

    let new_user = Address::generate(&env);

    let result = client.try_transfer_token(&token_id, &new_user);
    assert!(result.is_err());
}

#[test]
fn test_pause_blocks_stake_tokens() {
    let (env, client, admin) = setup();

    client.emergency_pause(&admin, &None, &None, &None);

    let user = Address::generate(&env);

    let result = client.try_stake_tokens(
        &user,
        &String::from_str(&env, "standard"),
        &100,
    );
    assert!(result.is_err());
}

#[test]
fn test_pause_blocks_subscription_ops() {
    let (env, client, admin) = setup();

    client.emergency_pause(&admin, &None, &None, &None);

    let user = Address::generate(&env);

    let result = client.try_create_subscription(
        &String::from_str(&env, "sub-1"),
        &user,
        &Address::generate(&env),
        &100,
        &86_400,
    );
    assert!(result.is_err());
}

#[test]
fn test_pause_blocks_fractionalize() {
    let (env, client, admin) = setup();

    let user = Address::generate(&env);
    let token_id = issue_test_token(&client, &admin, &user);

    client.emergency_pause(&admin, &None, &None, &None);

    let result = client.try_fractionalize_token(&token_id, &100, &1);
    assert!(result.is_err());
}

#[test]
fn test_unpause_resumes_operations() {
    let (env, client, admin) = setup();

    client.emergency_pause(&admin, &None, &None, &None);

    let user = Address::generate(&env);

    let result = client.try_issue_token(
        &BytesN::<32>::random(&env),
        &user,
        &(env.ledger().timestamp() + 86_400),
    );
    assert!(result.is_err());

    client.emergency_unpause(&admin);

    let token_id = BytesN::<32>::random(&env);
    let expiry = env.ledger().timestamp() + 86_400;
    client.issue_token(&token_id, &user, &expiry);

    let token = client.get_token(&token_id);
    assert_eq!(token.user, user);
}
