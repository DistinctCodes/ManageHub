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
}

#[cfg(test)]
mod tests {
    use super::Error;

    /// Dummy function to simulate subscription creation.
    fn simulate_subscription_creation(duplicate: bool) -> Result<(), Error> {
        if duplicate {
            Err(Error::SubscriptionAlreadyExists)
        } else {
            Ok(())
        }
    }

    #[test]
    fn returns_subscription_already_exists() {
        let result = simulate_subscription_creation(true);
        assert!(matches!(result, Err(Error::SubscriptionAlreadyExists)));
    }

    #[test]
    fn succeeds_when_not_duplicate() {
        let result = simulate_subscription_creation(false);
        assert!(result.is_ok());
    }
}
