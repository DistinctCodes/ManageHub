use soroban_sdk::contracterror;

/// Membership token contract errors.
///
/// Error code range: 3000–3999
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MembershipTokenError {
    /// No admin has been configured.
    AdminNotSet = 3000,
    /// Token with this ID already exists.
    TokenAlreadyIssued = 3001,
    /// Expiry date must be in the future.
    InvalidExpiryDate = 3002,
    /// Token with this ID not found.
    TokenNotFound = 3003,
    /// Token has expired.
    TokenExpired = 3004,
}
