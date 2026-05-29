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
