/// Default grace period: 3 days in seconds.
pub const DEFAULT_GRACE_SECONDS: u64 = 259_200;

#[derive(Debug, PartialEq)]
pub enum SubscriptionStatus {
    Active,
    InGracePeriod,
    Expired,
}

/// Returns the subscription status based on timestamps.
///
/// - `Active`        when `current_ts < expiry_ts`
/// - `InGracePeriod` when `expiry_ts <= current_ts < expiry_ts + grace_seconds`
/// - `Expired`       when `current_ts >= expiry_ts + grace_seconds`
pub fn get_subscription_status(
    expiry_ts: u64,
    current_ts: u64,
    grace_seconds: u64,
) -> SubscriptionStatus {
    if current_ts < expiry_ts {
        SubscriptionStatus::Active
    } else if current_ts < expiry_ts.saturating_add(grace_seconds) {
        SubscriptionStatus::InGracePeriod
    } else {
        SubscriptionStatus::Expired
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXPIRY: u64 = 1_000_000;
    const GRACE: u64 = DEFAULT_GRACE_SECONDS;

    #[test]
    fn active_well_before_expiry() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY - 1000, GRACE),
            SubscriptionStatus::Active
        );
    }

    #[test]
    fn active_one_second_before_expiry() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY - 1, GRACE),
            SubscriptionStatus::Active
        );
    }

    #[test]
    fn in_grace_period_at_exact_expiry() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY, GRACE),
            SubscriptionStatus::InGracePeriod
        );
    }

    #[test]
    fn in_grace_period_one_second_before_grace_ends() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY + GRACE - 1, GRACE),
            SubscriptionStatus::InGracePeriod
        );
    }

    #[test]
    fn expired_at_exact_grace_boundary() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY + GRACE, GRACE),
            SubscriptionStatus::Expired
        );
    }

    #[test]
    fn expired_well_past_grace() {
        assert_eq!(
            get_subscription_status(EXPIRY, EXPIRY + GRACE + 10_000, GRACE),
            SubscriptionStatus::Expired
        );
    }
}
