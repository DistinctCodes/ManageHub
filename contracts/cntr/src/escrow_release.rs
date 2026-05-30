pub fn validate_escrow_release(
    booking_status: &str,
    dispute_window_expired: bool,
) -> Result<(), &'static str> {
    if booking_status != "COMPLETED" {
        return Err("Booking not completed");
    }
    if !dispute_window_expired {
        return Err("Dispute window still active");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ok_when_completed_and_window_expired() {
        assert_eq!(validate_escrow_release("COMPLETED", true), Ok(()));
    }

    #[test]
    fn err_when_not_completed() {
        assert_eq!(
            validate_escrow_release("PENDING", true),
            Err("Booking not completed")
        );
    }

    #[test]
    fn err_when_dispute_window_active() {
        assert_eq!(
            validate_escrow_release("COMPLETED", false),
            Err("Dispute window still active")
        );
    }

    #[test]
    fn err_when_both_conditions_fail_returns_not_completed() {
        assert_eq!(
            validate_escrow_release("PENDING", false),
            Err("Booking not completed")
        );
    }

    #[test]
    fn err_for_cancelled_status() {
        assert_eq!(
            validate_escrow_release("CANCELLED", true),
            Err("Booking not completed")
        );
    }
}
