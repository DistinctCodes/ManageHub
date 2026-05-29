/// Default payment tolerance in stroops (1 XLM = 10_000_000 stroops).
pub const DEFAULT_TOLERANCE: i128 = 100;

#[derive(Debug, PartialEq)]
pub enum PaymentError {
    NegativePayment,
    ZeroPayment,
    Underpayment,
}

/// Validates that `paid_amount` satisfies `expected_amount` within `tolerance`.
///
/// Accepts if `paid_amount >= expected_amount - tolerance`.
/// Overpayment is always accepted.
pub fn validate_payment(
    paid_amount: i128,
    expected_amount: i128,
    tolerance: i128,
) -> Result<(), PaymentError> {
    if paid_amount < 0 {
        return Err(PaymentError::NegativePayment);
    }
    if paid_amount == 0 && expected_amount > 0 {
        return Err(PaymentError::ZeroPayment);
    }
    if paid_amount < expected_amount - tolerance {
        return Err(PaymentError::Underpayment);
    }
    Ok(())
}
