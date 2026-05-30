/// Default dispute window: 48 hours in seconds.
pub const DEFAULT_DISPUTE_WINDOW_SECONDS: u64 = 172_800;

/// Returns `true` if `current_timestamp` is within the dispute window after checkout.
pub fn is_within_dispute_window(
    checkout_timestamp: u64,
    current_timestamp: u64,
    window_seconds: u64,
) -> bool {
    current_timestamp < checkout_timestamp.saturating_add(window_seconds)
}

/// Returns the timestamp at which the dispute window expires.
pub fn dispute_window_expires_at(checkout_timestamp: u64, window_seconds: u64) -> u64 {
    checkout_timestamp.saturating_add(window_seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    const CHECKOUT: u64 = 1_000_000;
    const WINDOW: u64 = DEFAULT_DISPUTE_WINDOW_SECONDS;

    #[test]
    fn inside_window() {
        assert!(is_within_dispute_window(CHECKOUT, CHECKOUT + 1000, WINDOW));
    }

    #[test]
    fn outside_window() {
        assert!(!is_within_dispute_window(CHECKOUT, CHECKOUT + WINDOW + 1, WINDOW));
    }

    #[test]
    fn exactly_at_boundary_is_outside() {
        assert!(!is_within_dispute_window(CHECKOUT, CHECKOUT + WINDOW, WINDOW));
    }

    #[test]
    fn at_checkout_moment() {
        assert!(is_within_dispute_window(CHECKOUT, CHECKOUT, WINDOW));
    }

    #[test]
    fn expires_at_returns_correct_timestamp() {
        assert_eq!(dispute_window_expires_at(CHECKOUT, WINDOW), CHECKOUT + WINDOW);
    }
}
