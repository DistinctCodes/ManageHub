pub fn validate_deduction(current_balance: i128, deduction_amount: i128) -> Result<i128, &'static str> {
    if deduction_amount <= 0 {
        return Err("Deduction amount must be positive");
    }
    if current_balance < deduction_amount {
        return Err("Insufficient credits");
    }
    Ok(current_balance - deduction_amount)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success() {
        assert_eq!(validate_deduction(100, 40), Ok(60));
    }

    #[test]
    fn exact_balance() {
        assert_eq!(validate_deduction(50, 50), Ok(0));
    }

    #[test]
    fn insufficient() {
        assert_eq!(validate_deduction(10, 20), Err("Insufficient credits"));
    }

    #[test]
    fn zero_deduction() {
        assert_eq!(validate_deduction(100, 0), Err("Deduction amount must be positive"));
    }

    #[test]
    fn negative_deduction() {
        assert_eq!(validate_deduction(100, -5), Err("Deduction amount must be positive"));
    }

    #[test]
    fn zero_balance_positive_deduction() {
        assert_eq!(validate_deduction(0, 1), Err("Insufficient credits"));
    }
/// Error types for credit deduction operations.
#[derive(Debug, Clone, PartialEq)]
pub enum DeductionError {
    InsufficientBalance,
    InvalidAmount,
}

/// Deducts `amount` from the given `balance`.
///
/// Returns the new balance on success, or a `DeductionError` on failure.
///
/// # Errors
/// - `InvalidAmount` if amount is zero or negative (represented as 0 for u128).
/// - `InsufficientBalance` if balance < amount.
pub fn deduct_credits(balance: u128, amount: u128) -> Result<u128, DeductionError> {
    if amount == 0 {
        return Err(DeductionError::InvalidAmount);
    }
    if balance < amount {
        return Err(DeductionError::InsufficientBalance);
    }
    Ok(balance - amount)
}
