/// Validates a credit top-up operation.
///
/// Returns `Ok(new_balance)` when `topup_amount > 0` and
/// `current_balance + topup_amount <= max_balance`.
pub fn validate_topup(
    current_balance: i128,
    topup_amount: i128,
    max_balance: i128,
) -> Result<i128, &'static str> {
    if topup_amount <= 0 {
        return Err("Top-up amount must be positive");
    }
    let new_balance = current_balance.checked_add(topup_amount).ok_or("Balance would exceed maximum allowed")?;
    if new_balance > max_balance {
        return Err("Balance would exceed maximum allowed");
    }
    Ok(new_balance)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_topup() {
        assert_eq!(validate_topup(100, 50, 1000), Ok(150));
    }

    #[test]
    fn test_zero_topup_rejected() {
        assert_eq!(validate_topup(100, 0, 1000), Err("Top-up amount must be positive"));
    }

    #[test]
    fn test_negative_topup_rejected() {
        assert_eq!(validate_topup(100, -10, 1000), Err("Top-up amount must be positive"));
    }

    #[test]
    fn test_exact_maximum_boundary() {
        assert_eq!(validate_topup(900, 100, 1000), Ok(1000));
    }

    #[test]
    fn test_one_above_maximum_rejected() {
        assert_eq!(validate_topup(900, 101, 1000), Err("Balance would exceed maximum allowed"));
    }

    #[test]
    fn test_overflow_guard() {
        assert_eq!(validate_topup(i128::MAX, 1, i128::MAX), Err("Balance would exceed maximum allowed"));
    }

    #[test]
    fn test_zero_current_balance() {
        assert_eq!(validate_topup(0, 500, 1000), Ok(500));
    }
}
