//! Amount-input guards for the payment_escrow property/fuzz harness (#1876).
//!
//! Shared predicate for valid escrow amounts used by entrypoint checks and
//! generated test inputs.

/// Returns `true` when `amount` is a usable (strictly positive) escrow amount.
pub fn is_valid_amount(amount: i128) -> bool {
    amount > 0
}

/// Clamp/validate a fuzzed amount, returning `None` for inputs the contract
/// should reject (zero or negative).
pub fn checked_amount(amount: i128) -> Option<i128> {
    if is_valid_amount(amount) {
        Some(amount)
    } else {
        None
    }
}
