pub fn calculate_refund_amount(
    booking_amount_stroops: i128,
    cancellation_hours_before_start: u64,
) -> i128 {
    if cancellation_hours_before_start >= 48 {
        booking_amount_stroops
    } else if cancellation_hours_before_start >= 24 {
        booking_amount_stroops / 2
    } else {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_refund_at_48h() {
        assert_eq!(calculate_refund_amount(1_000_000, 48), 1_000_000);
    }

    #[test]
    fn full_refund_beyond_48h() {
        assert_eq!(calculate_refund_amount(1_000_000, 72), 1_000_000);
    }

    #[test]
    fn half_refund_at_24h() {
        assert_eq!(calculate_refund_amount(1_000_000, 24), 500_000);
    }

    #[test]
    fn half_refund_at_47h() {
        assert_eq!(calculate_refund_amount(1_000_000, 47), 500_000);
    }

    #[test]
    fn no_refund_at_23h() {
        assert_eq!(calculate_refund_amount(1_000_000, 23), 0);
    }

    #[test]
    fn no_refund_at_0h() {
        assert_eq!(calculate_refund_amount(1_000_000, 0), 0);
    }

    #[test]
    fn integer_division_no_float() {
        // odd amount: 1_000_001 / 2 = 500_000 (integer division)
        assert_eq!(calculate_refund_amount(1_000_001, 24), 500_000);
    }
}
