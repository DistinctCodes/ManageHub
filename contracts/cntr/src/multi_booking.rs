/// Returns the maximum number of simultaneous active bookings allowed for a tier.
/// Unknown tier strings default to the Bronze limit (2).
pub fn get_booking_limit(tier: &str) -> u32 {
    match tier {
        "Bronze" => 2,
        "Silver" => 5,
        "Gold" => 10,
        "Platinum" => u32::MAX,
        _ => 2,
    }
}

/// Returns true if the member can make another booking given their current active bookings.
pub fn can_make_booking(tier: &str, current_active_bookings: u32) -> bool {
    current_active_bookings < get_booking_limit(tier)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bronze_limit() {
        assert_eq!(get_booking_limit("Bronze"), 2);
    }

    #[test]
    fn test_silver_limit() {
        assert_eq!(get_booking_limit("Silver"), 5);
    }

    #[test]
    fn test_gold_limit() {
        assert_eq!(get_booking_limit("Gold"), 10);
    }

    #[test]
    fn test_platinum_limit() {
        assert_eq!(get_booking_limit("Platinum"), u32::MAX);
    }

    #[test]
    fn test_unknown_tier_defaults_to_bronze() {
        assert_eq!(get_booking_limit("Diamond"), 2);
    }

    #[test]
    fn test_can_make_booking_below_limit() {
        assert!(can_make_booking("Bronze", 1));
    }

    #[test]
    fn test_cannot_make_booking_at_limit() {
        assert!(!can_make_booking("Bronze", 2));
    }

    #[test]
    fn test_cannot_make_booking_above_limit() {
        assert!(!can_make_booking("Silver", 6));
    }
}
