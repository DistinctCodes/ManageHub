use soroban_sdk::contracttype;

/// Centralized error type for ManageHub contract operations.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// Returned when attempting to create a subscription that already exists.
    SubscriptionAlreadyExists,
    /// Returned when payment details do not satisfy validation rules.
    InvalidPayment,
    /// Returned when the referenced user cannot be found.
    UserNotFound,
    /// Returned when the caller lacks sufficient permissions.
    Unauthorized,
    /// Returned when attempting to create a log entry that already exists.
    LogAlreadyExists,
    /// Returned when a token has already been issued.
    TokenAlreadyIssued,
    /// Returned when an admin address has not been configured yet.
    AdminNotSet,
    /// Returned when the requested token cannot be located in storage.
    TokenNotFound,
    /// Returned when the token has expired or is no longer valid.
    TokenExpired,
    /// Returned when the supplied expiry date is invalid (e.g., in the past).
    InvalidExpiryDate,
}

#[cfg(test)]
mod tests {
    use super::Error;

    fn simulate_duplicate_subscription(attempt_duplicate: bool) -> Result<(), Error> {
        if attempt_duplicate {
            Err(Error::SubscriptionAlreadyExists)
        } else {
            Ok(())
        }
    }

    #[test]
    fn returns_subscription_already_exists() {
        let result = simulate_duplicate_subscription(true);
        assert!(matches!(result, Err(Error::SubscriptionAlreadyExists)));
    }
}
