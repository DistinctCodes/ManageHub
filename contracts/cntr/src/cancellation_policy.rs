#[derive(Debug, PartialEq, Clone)]
pub enum CancellationPolicy {
    Flexible,
    Moderate,
    Strict,
}

/// Computes the refund amount in stroops based on the cancellation policy.
///
/// - Flexible:  always 100% refund.
/// - Moderate:  100% if >= 48h before start, 50% if 24–47h, 0% if < 24h.
/// - Strict:    100% if >= 96h before start, 0% otherwise.
pub fn apply_policy(
    policy: CancellationPolicy,
    hours_before_start: u64,
    amount_stroops: i128,
) -> i128 {
    match policy {
        CancellationPolicy::Flexible => amount_stroops,
        CancellationPolicy::Moderate => {
            if hours_before_start >= 48 {
                amount_stroops
            } else if hours_before_start >= 24 {
                amount_stroops / 2
            } else {
                0
            }
        }
        CancellationPolicy::Strict => {
            if hours_before_start >= 96 {
                amount_stroops
            } else {
                0
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const AMOUNT: i128 = 1_000_000;

    // Flexible
    #[test]
    fn flexible_always_full_refund() {
        assert_eq!(apply_policy(CancellationPolicy::Flexible, 0, AMOUNT), AMOUNT);
    }

    #[test]
    fn flexible_full_refund_at_48h() {
        assert_eq!(apply_policy(CancellationPolicy::Flexible, 48, AMOUNT), AMOUNT);
    }

    #[test]
    fn flexible_full_refund_at_100h() {
        assert_eq!(apply_policy(CancellationPolicy::Flexible, 100, AMOUNT), AMOUNT);
    }

    // Moderate
    #[test]
    fn moderate_full_refund_at_48h_or_more() {
        assert_eq!(apply_policy(CancellationPolicy::Moderate, 48, AMOUNT), AMOUNT);
    }

    #[test]
    fn moderate_half_refund_between_24_and_47h() {
        assert_eq!(apply_policy(CancellationPolicy::Moderate, 24, AMOUNT), AMOUNT / 2);
    }

    #[test]
    fn moderate_no_refund_under_24h() {
        assert_eq!(apply_policy(CancellationPolicy::Moderate, 10, AMOUNT), 0);
    }

    // Strict
    #[test]
    fn strict_full_refund_at_96h_or_more() {
        assert_eq!(apply_policy(CancellationPolicy::Strict, 96, AMOUNT), AMOUNT);
    }

    #[test]
    fn strict_no_refund_at_95h() {
        assert_eq!(apply_policy(CancellationPolicy::Strict, 95, AMOUNT), 0);
    }

    #[test]
    fn strict_no_refund_under_24h() {
        assert_eq!(apply_policy(CancellationPolicy::Strict, 0, AMOUNT), 0);
    }
}
