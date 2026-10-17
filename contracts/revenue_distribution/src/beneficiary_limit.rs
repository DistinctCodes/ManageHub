//! Beneficiary-count cap for `revenue_distribution` splits (#1893).
//!
//! Bounds the number of beneficiaries per split so distribution loops stay
//! bounded and predictable.

/// Maximum number of beneficiaries allowed in a single split.
pub const MAX_BENEFICIARIES: u32 = 64;

/// Returns `true` when `count` is within the supported beneficiary cap.
pub fn within_beneficiary_cap(count: u32) -> bool {
    count <= MAX_BENEFICIARIES
}
