use cntr::credit_deduction::{deduct_credits, DeductionError};
use cntr::credit_topup::{topup_credits, TopupError, MAX_BALANCE};

// ============ Deduction Tests ============

#[test]
fn deduct_from_full_balance_success() {
    let balance: u128 = 1000;
    let result = deduct_credits(balance, 200);
    assert_eq!(result, Ok(800));
}

#[test]
fn deduct_exact_balance_leaving_zero() {
    let balance: u128 = 500;
    let result = deduct_credits(balance, 500);
    assert_eq!(result, Ok(0));
}

#[test]
fn deduct_more_than_balance_fails() {
    let balance: u128 = 100;
    let result = deduct_credits(balance, 200);
    assert_eq!(result, Err(DeductionError::InsufficientBalance));
}

#[test]
fn deduct_zero_fails() {
    let balance: u128 = 100;
    let result = deduct_credits(balance, 0);
    assert_eq!(result, Err(DeductionError::InvalidAmount));
}

#[test]
fn deduct_from_zero_balance_fails() {
    let balance: u128 = 0;
    let result = deduct_credits(balance, 1);
    assert_eq!(result, Err(DeductionError::InsufficientBalance));
}

#[test]
fn deduct_one_from_one_leaves_zero() {
    let result = deduct_credits(1, 1);
    assert_eq!(result, Ok(0));
}

// ============ Top-up Tests ============

#[test]
fn topup_from_zero_success() {
    let result = topup_credits(0, 500);
    assert_eq!(result, Ok(500));
}

#[test]
fn topup_to_exact_max_balance() {
    let current = MAX_BALANCE - 100;
    let result = topup_credits(current, 100);
    assert_eq!(result, Ok(MAX_BALANCE));
}

#[test]
fn topup_one_above_max_fails() {
    let current = MAX_BALANCE - 99;
    let result = topup_credits(current, 100);
    assert_eq!(result, Err(TopupError::ExceedsMaxBalance));
}

#[test]
fn topup_zero_fails() {
    let result = topup_credits(100, 0);
    assert_eq!(result, Err(TopupError::InvalidAmount));
}

#[test]
fn large_balance_accumulation() {
    let mut balance: u128 = 0;
    for _ in 0..10 {
        balance = topup_credits(balance, 100_000_000).unwrap();
    }
    assert_eq!(balance, 1_000_000_000);
    assert_eq!(balance, MAX_BALANCE);
}

#[test]
fn topup_at_max_balance_fails() {
    let result = topup_credits(MAX_BALANCE, 1);
    assert_eq!(result, Err(TopupError::ExceedsMaxBalance));
}
