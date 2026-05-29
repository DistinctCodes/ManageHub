/// Maximum credit balance a user can hold.
pub const MAX_BALANCE: u128 = 1_000_000_000;

/// Error types for credit top-up operations.
#[derive(Debug, Clone, PartialEq)]
pub enum TopupError {
    InvalidAmount,
    ExceedsMaxBalance,
}

/// Tops up `amount` to the given `balance`.
///
/// Returns the new balance on success, or a `TopupError` on failure.
///
/// # Errors
/// - `InvalidAmount` if amount is zero.
/// - `ExceedsMaxBalance` if balance + amount > MAX_BALANCE.
pub fn topup_credits(balance: u128, amount: u128) -> Result<u128, TopupError> {
    if amount == 0 {
        return Err(TopupError::InvalidAmount);
    }
    let new_balance = balance.checked_add(amount).unwrap_or(u128::MAX);
    if new_balance > MAX_BALANCE {
        return Err(TopupError::ExceedsMaxBalance);
    }
    Ok(new_balance)
}
