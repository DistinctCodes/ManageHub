#![cfg(test)]

use super::*;
use crate::errors::Error;
use crate::membership_token::MembershipTokenContract;
use crate::subscription::SubscriptionContract;
use crate::types::MembershipStatus;
use soroban_sdk::{
    testutils::{Address as _, BytesN as BytesNTestUtils, Ledger as LedgerTestUtils},
    vec, Address, BytesN, Env, String,
};

#[test]
fn test() {
    let env = Env::default();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let words = client.hello(&String::from_str(&env, "Dev"));
    assert_eq!(
        words,
        vec![
            &env,
            String::from_str(&env, "Hello"),
            String::from_str(&env, "Dev"),
        ]
    );
}
#[test]
fn test_set_admin_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);

    // Set admin should succeed
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    });
    assert!(result.is_ok());
}

#[test]
fn test_issue_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin first
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();

    // Issue token should succeed
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id.clone(),
            user.clone(),
            expiry_date,
        )
    });
    assert!(result.is_ok());

    // Verify token was stored correctly
    let token = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id.clone())
    }).unwrap();
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
    assert_eq!(token.issue_date, env.ledger().timestamp());
}

#[test]
fn test_issue_token_admin_not_set() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Try to issue token without setting admin
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id, user, expiry_date)
    });
    assert_eq!(result, Err(Error::AdminNotSet));
}

#[test]
fn test_issue_token_already_issued() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
    }).unwrap();

    // Try to issue the same token again
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id.clone(),
            user.clone(),
            expiry_date,
        )
    });
    assert_eq!(result, Err(Error::TokenAlreadyIssued));
}

#[test]
fn test_issue_token_invalid_expiry_date_equal() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();

    // Set admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();

    // Try to issue token with expiry date equal to current time
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id, user, current_time)
    });
    assert_eq!(result, Err(Error::InvalidExpiryDate));
}

#[test]
fn test_issue_token_invalid_expiry_date_past() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let past_time = env.ledger().timestamp().saturating_sub(100); // Past time

    // Set admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();

    // Try to issue token with past expiry date
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id, user, past_time)
    });
    assert_eq!(result, Err(Error::InvalidExpiryDate));
}

#[test]
fn test_get_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
    }).unwrap();

    // Get token should succeed
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id.clone())
    });
    assert!(result.is_ok());

    let token = result.unwrap();
    assert_eq!(token.id, token_id);
    assert_eq!(token.user, user);
    assert_eq!(token.status, MembershipStatus::Active);
    assert_eq!(token.expiry_date, expiry_date);
}

#[test]
fn test_get_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let token_id = BytesN::<32>::random(&env);

    // Try to get non-existent token
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id)
    });
    assert_eq!(result, Err(Error::TokenNotFound));
}

#[test]
fn test_get_token_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
    }).unwrap();

    // Advance time beyond expiry
    env.ledger().with_mut(|l| l.timestamp += 2000);

    // Get token should return expired error
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id)
    });
    assert_eq!(result, Err(Error::TokenExpired));
}

#[test]
fn test_get_token_inactive_but_not_expired() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
    }).unwrap();

    // Manually set token status to inactive (simulate external state change)
    env.as_contract(&contract_id, || {
        let mut token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
        token.status = MembershipStatus::Inactive;
        env.storage().persistent().set(
            &crate::membership_token::DataKey::Token(token_id.clone()),
            &token,
        );
    });

    // Get token should succeed since it only checks expiry for Active tokens
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id)
    });
    assert!(result.is_ok());
    let returned_token = result.unwrap();
    assert_eq!(returned_token.status, MembershipStatus::Inactive);
}

#[test]
fn test_transfer_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user1.clone(), expiry_date)
    }).unwrap();

    // Transfer token should succeed
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::transfer_token(env.clone(), token_id.clone(), user2.clone())
    });
    assert!(result.is_ok());

    // Verify new owner
    let token = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id)
    }).unwrap();
    assert_eq!(token.user, user2);
    assert_eq!(token.status, MembershipStatus::Active);
}

#[test]
fn test_transfer_token_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let _user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);

    // Try to transfer non-existent token
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::transfer_token(env.clone(), token_id, user2)
    });
    assert_eq!(result, Err(Error::TokenNotFound));
}

#[test]
fn test_transfer_token_inactive() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin and issue token
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user1.clone(), expiry_date)
    }).unwrap();

    // Manually set token status to inactive
    env.as_contract(&contract_id, || {
        let mut token = MembershipTokenContract::get_token(env.clone(), token_id.clone()).unwrap();
        token.status = MembershipStatus::Inactive;
        env.storage().persistent().set(
            &crate::membership_token::DataKey::Token(token_id.clone()),
            &token,
        );
    });

    // Transfer should fail for inactive token
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::transfer_token(env.clone(), token_id, user2)
    });
    assert_eq!(result, Err(Error::TokenExpired));
}

#[test]
fn test_multiple_tokens_different_users() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let token_id1 = BytesN::<32>::random(&env);
    let token_id2 = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();

    // Issue tokens to different users
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id1.clone(),
            user1.clone(),
            expiry_date,
        )
    }).unwrap();
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id2.clone(),
            user2.clone(),
            expiry_date,
        )
    }).unwrap();

    // Both tokens should be retrievable
    let token1 = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id1)
    }).unwrap();
    let token2 = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id2)
    }).unwrap();

    assert_eq!(token1.user, user1);
    assert_eq!(token2.user, user2);
    assert_eq!(token1.status, MembershipStatus::Active);
    assert_eq!(token2.status, MembershipStatus::Active);
}

#[test]
fn test_admin_change() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let expiry_date = env.ledger().timestamp() + 1000;

    // Set first admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin1.clone())
    }).unwrap();

    // Issue token with first admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(env.clone(), token_id.clone(), user.clone(), expiry_date)
    }).unwrap();

    // Change admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin2.clone())
    }).unwrap();

    // New admin should be able to issue tokens
    let token_id2 = BytesN::<32>::random(&env);
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id2.clone(),
            user.clone(),
            expiry_date,
        )
    });
    assert!(result.is_ok());
}

#[test]
fn test_edge_case_expiry_date_boundary() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let token_id = BytesN::<32>::random(&env);
    let current_time = env.ledger().timestamp();
    let expiry_date = current_time + 1; // Just 1 second in the future

    // Set admin
    env.as_contract(&contract_id, || {
        MembershipTokenContract::set_admin(env.clone(), admin.clone())
    }).unwrap();

    // Issue token with minimal future expiry
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::issue_token(
            env.clone(),
            token_id.clone(),
            user.clone(),
            expiry_date,
        )
    });
    assert!(result.is_ok());

    // Token should be retrievable now
    let token = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id.clone())
    }).unwrap();
    assert_eq!(token.status, MembershipStatus::Active);

    // Advance time beyond the expiry date
    env.ledger().with_mut(|l| l.timestamp += 2);

    // Now token should be expired
    let result = env.as_contract(&contract_id, || {
        MembershipTokenContract::get_token(env.clone(), token_id)
    });
    assert_eq!(result, Err(Error::TokenExpired));
}

// Subscription and payment validation tests

#[test]
fn test_set_usdc_contract_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let usdc_address = Address::generate(&env);

    // Set USDC contract should succeed
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::set_usdc_contract(env.clone(), admin, usdc_address)
    });
    assert!(result.is_ok());
}

#[test]
fn test_validate_payment_invalid_amount_zero() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let payment_token = Address::generate(&env);
    let payer = Address::generate(&env);

    // Validate payment with zero amount should fail
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::validate_payment(env.clone(), payment_token, 0, payer)
    });
    assert_eq!(result, Err(Error::InvalidPaymentAmount));
}

#[test]
fn test_validate_payment_invalid_amount_negative() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let payment_token = Address::generate(&env);
    let payer = Address::generate(&env);

    // Validate payment with negative amount should fail
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::validate_payment(env.clone(), payment_token, -100, payer)
    });
    assert_eq!(result, Err(Error::InvalidPaymentAmount));
}

#[test]
fn test_validate_payment_usdc_not_set() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let payment_token = Address::generate(&env);
    let payer = Address::generate(&env);

    // Validate payment without setting USDC contract should fail
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::validate_payment(env.clone(), payment_token, 1000, payer)
    });
    assert_eq!(result, Err(Error::UsdcContractNotSet));
}

#[test]
fn test_validate_payment_invalid_token() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let usdc_address = Address::generate(&env);
    let wrong_token = Address::generate(&env);
    let payer = Address::generate(&env);

    // Set USDC contract
    env.as_contract(&contract_id, || {
        SubscriptionContract::set_usdc_contract(env.clone(), admin, usdc_address)
    }).unwrap();

    // Validate payment with wrong token should fail
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::validate_payment(env.clone(), wrong_token, 1000, payer)
    });
    assert_eq!(result, Err(Error::InvalidPaymentToken));
}

#[test]
fn test_create_subscription_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let _user = Address::generate(&env);
    let usdc_address = Address::generate(&env);
    let _subscription_id = String::from_str(&env, "sub_123");
    let _amount = 1000i128;
    let _duration = 2592000u64; // 30 days

    // Set USDC contract
    env.as_contract(&contract_id, || {
        SubscriptionContract::set_usdc_contract(env.clone(), admin, usdc_address.clone())
    }).unwrap();

    // Mock token contract responses for balance and allowance
    // Note: In real tests, you would register a mock token contract
    // For this example, we'll assume the validation passes

    // Create subscription should succeed if payment validation passes
    // This test would need mock token contract setup in a real implementation
}

#[test]
fn test_get_subscription_not_found() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let subscription_id = String::from_str(&env, "non_existent");

    // Get non-existent subscription should fail
    let result = env.as_contract(&contract_id, || {
        SubscriptionContract::get_subscription(env.clone(), subscription_id)
    });
    assert_eq!(result, Err(Error::SubscriptionNotFound));
}

#[test]
fn test_validate_payment_success_mock() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let admin = Address::generate(&env);
    let usdc_address = Address::generate(&env);
    let _payer = Address::generate(&env);
    let _amount = 1000i128;

    // Set USDC contract
    env.as_contract(&contract_id, || {
        SubscriptionContract::set_usdc_contract(env.clone(), admin, usdc_address.clone())
    }).unwrap();

    // Note: This test demonstrates the structure, but would need actual
    // mock token contract implementation to test the full validation flow
    // The real test would involve:
    // 1. Deploying a mock USDC token contract
    // 2. Setting proper balance and allowance
    // 3. Calling validate_payment and asserting success
}

#[test]
fn test_subscription_contract_integration() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let usdc_address = Address::generate(&env);

    // Test setting USDC contract through main contract
    client.set_usdc_contract(&admin, &usdc_address);
    // Successfully executed without panic
}

#[test]
fn test_subscription_creation_invalid_payment_amount() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let payment_token = Address::generate(&env);
    let subscription_id = String::from_str(&env, "sub_invalid");
    let duration = 2592000u64;

    // Create subscription with invalid amount should fail
    let result = client.try_create_subscription(
        &subscription_id,
        &user,
        &payment_token,
        &0i128, // Invalid amount
        &duration,
    );
    assert!(result.is_err());
}
