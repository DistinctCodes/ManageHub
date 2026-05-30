pub fn is_subscription_expired(expiry_timestamp: u64, current_timestamp: u64) -> bool {
    current_timestamp >= expiry_timestamp
}

pub fn days_until_expiry(expiry_timestamp: u64, current_timestamp: u64) -> i64 {
    let diff = expiry_timestamp as i64 - current_timestamp as i64;
    diff / 86400
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expired_when_current_past_expiry() {
        assert!(is_subscription_expired(100, 200));
    }

    #[test]
    fn not_expired_when_current_before_expiry() {
        assert!(!is_subscription_expired(200, 100));
    }

    #[test]
    fn expired_at_boundary() {
        assert!(is_subscription_expired(100, 100));
    }

    #[test]
    fn days_until_positive_when_not_expired() {
        // 10 days in the future
        assert_eq!(days_until_expiry(864000, 0), 10);
    }

    #[test]
    fn days_until_negative_when_expired() {
        // expired 1 day ago
        assert_eq!(days_until_expiry(0, 86400), -1);
    }

    #[test]
    fn days_until_zero_at_boundary() {
        assert_eq!(days_until_expiry(100, 100), 0);
    }
}
