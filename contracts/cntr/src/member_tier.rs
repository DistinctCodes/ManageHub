#[derive(Debug, PartialEq, Clone)]
pub enum MemberTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
}

pub fn calculate_tier(total_bookings: u32, total_spend_stroops: i128) -> MemberTier {
    if total_bookings >= 100 || total_spend_stroops >= 100_000_000 {
        MemberTier::Platinum
    } else if total_bookings >= 30 || total_spend_stroops >= 20_000_000 {
        MemberTier::Gold
    } else if total_bookings >= 10 || total_spend_stroops >= 5_000_000 {
        MemberTier::Silver
    } else {
        MemberTier::Bronze
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bronze_by_default() {
        assert_eq!(calculate_tier(0, 0), MemberTier::Bronze);
    }

    #[test]
    fn silver_at_10_bookings() {
        assert_eq!(calculate_tier(10, 0), MemberTier::Silver);
    }

    #[test]
    fn silver_by_spend() {
        assert_eq!(calculate_tier(0, 5_000_000), MemberTier::Silver);
    }

    #[test]
    fn gold_at_30_bookings() {
        assert_eq!(calculate_tier(30, 0), MemberTier::Gold);
    }

    #[test]
    fn gold_by_spend() {
        assert_eq!(calculate_tier(0, 20_000_000), MemberTier::Gold);
    }

    #[test]
    fn platinum_at_100_bookings() {
        assert_eq!(calculate_tier(100, 0), MemberTier::Platinum);
    }

    #[test]
    fn platinum_by_spend() {
        assert_eq!(calculate_tier(0, 100_000_000), MemberTier::Platinum);
    }

    #[test]
    fn below_silver_threshold() {
        assert_eq!(calculate_tier(9, 4_999_999), MemberTier::Bronze);
    }
}
