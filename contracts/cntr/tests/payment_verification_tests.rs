use cntr::payment_validator::{validate_payment, PaymentError, DEFAULT_TOLERANCE};

const EXPECTED: i128 = 10_000_000; // 1 XLM in stroops
const TOL: i128 = DEFAULT_TOLERANCE;

#[test]
fn exact_amount_passes() {
    assert!(validate_payment(EXPECTED, EXPECTED, TOL).is_ok());
}

#[test]
fn overpayment_passes() {
    assert!(validate_payment(EXPECTED + 1_000_000, EXPECTED, TOL).is_ok());
}

#[test]
fn within_tolerance_passes() {
    assert!(validate_payment(EXPECTED - TOL, EXPECTED, TOL).is_ok());
}

#[test]
fn one_stroop_below_tolerance_fails() {
    assert_eq!(
        validate_payment(EXPECTED - TOL - 1, EXPECTED, TOL),
        Err(PaymentError::Underpayment)
    );
}

#[test]
fn underpayment_well_below_fails() {
    assert_eq!(
        validate_payment(EXPECTED / 2, EXPECTED, TOL),
        Err(PaymentError::Underpayment)
    );
}

#[test]
fn zero_payment_fails() {
    assert_eq!(
        validate_payment(0, EXPECTED, TOL),
        Err(PaymentError::ZeroPayment)
    );
}

#[test]
fn negative_payment_fails() {
    assert_eq!(
        validate_payment(-1, EXPECTED, TOL),
        Err(PaymentError::NegativePayment)
    );
}

#[test]
fn zero_expected_amount_with_zero_paid_passes() {
    assert!(validate_payment(0, 0, TOL).is_ok());
}

#[test]
fn tolerance_of_zero_exact_passes() {
    assert!(validate_payment(EXPECTED, EXPECTED, 0).is_ok());
}

#[test]
fn tolerance_of_zero_one_stroop_under_fails() {
    assert_eq!(
        validate_payment(EXPECTED - 1, EXPECTED, 0),
        Err(PaymentError::Underpayment)
    );
}

#[test]
fn large_amount_near_i128_max_passes() {
    let large = i128::MAX / 2;
    assert!(validate_payment(large, large, TOL).is_ok());
}
