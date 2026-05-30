/// Validates that a received payment amount is within tolerance of the expected amount.
///
/// Returns `Ok(())` when `received_stroops >= expected_stroops - tolerance_stroops`.
pub fn validate_payment_amount(
    received_stroops: i128,
    expected_stroops: i128,
    tolerance_stroops: i128,
) -> Result<(), &'static str> {
    if expected_stroops <= 0 {
        return Err("Expected amount must be positive");
    }
    let threshold = expected_stroops.saturating_sub(tolerance_stroops);
    if received_stroops >= threshold {
        Ok(())
    } else {
        Err("Payment amount insufficient")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exact_amount() {
        assert_eq!(validate_payment_amount(1000, 1000, 0), Ok(()));
    }

    #[test]
    fn test_within_tolerance() {
        assert_eq!(validate_payment_amount(990, 1000, 10), Ok(()));
    }

    #[test]
    fn test_one_stroop_below_tolerance() {
        assert_eq!(validate_payment_amount(989, 1000, 10), Err("Payment amount insufficient"));
    }

    #[test]
    fn test_overpayment_accepted() {
        assert_eq!(validate_payment_amount(1500, 1000, 0), Ok(()));
    }

    #[test]
    fn test_zero_expected_rejected() {
        assert_eq!(validate_payment_amount(0, 0, 0), Err("Expected amount must be positive"));
    }

    #[test]
    fn test_negative_expected_rejected() {
        assert_eq!(validate_payment_amount(100, -1, 0), Err("Expected amount must be positive"));
    }

    #[test]
    fn test_underpayment_no_tolerance() {
        assert_eq!(validate_payment_amount(999, 1000, 0), Err("Payment amount insufficient"));
    }
}
