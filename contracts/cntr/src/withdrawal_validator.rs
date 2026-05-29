pub fn validate_withdrawal(
    owner_address: &str,
    caller_address: &str,
    available_balance: i128,
    requested_amount: i128,
) -> Result<(), &'static str> {
    if caller_address != owner_address {
        return Err("Unauthorized: caller is not the owner");
    }
    if requested_amount <= 0 {
        return Err("Withdrawal amount must be positive");
    }
    if requested_amount > available_balance {
        return Err("Insufficient balance");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn success() {
        assert_eq!(validate_withdrawal("alice", "alice", 100, 50), Ok(()));
    }

    #[test]
    fn exact_balance() {
        assert_eq!(validate_withdrawal("alice", "alice", 100, 100), Ok(()));
    }

    #[test]
    fn unauthorized() {
        assert_eq!(
            validate_withdrawal("alice", "bob", 100, 50),
            Err("Unauthorized: caller is not the owner")
        );
    }

    #[test]
    fn zero_amount() {
        assert_eq!(
            validate_withdrawal("alice", "alice", 100, 0),
            Err("Withdrawal amount must be positive")
        );
    }

    #[test]
    fn negative_amount() {
        assert_eq!(
            validate_withdrawal("alice", "alice", 100, -1),
            Err("Withdrawal amount must be positive")
        );
    }

    #[test]
    fn insufficient_balance() {
        assert_eq!(
            validate_withdrawal("alice", "alice", 10, 20),
            Err("Insufficient balance")
        );
    }
}
