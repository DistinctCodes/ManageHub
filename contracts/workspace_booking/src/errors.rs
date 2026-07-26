use soroban_sdk::contracterror;

/// Contract error definitions.
///
/// Error code range: 4000–4999
///
/// 4000–4099 → Core contract errors
/// 4100–4199 → Booking related errors
/// 4200–4299 → Workspace related errors
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set yet.
    AdminNotSet = 4000,

    /// Caller is not authorized.
    Unauthorized = 4001,

    /// Contract already initialized.
    AlreadyInitialized = 4002,

    /// Payment token not configured.
    PaymentTokenNotSet = 4003,

    /// Provided string exceeds allowed length.
    StringTooLong = 4004,

    /// Workspace capacity must be >= 1.
    InvalidCapacity = 4005,

    /// Hourly rate must be > 0.
    InvalidRate = 4006,

    /// Invalid booking time window.
    InvalidTimeRange = 4007,

    /// Contract is paused.
    ContractPaused = 4008,

    // -----------------------------
    // Booking Errors (4100–4199)
    // -----------------------------
    /// Booking ID not found.
    BookingNotFound = 4100,

    /// Booking already exists.
    BookingAlreadyExists = 4101,

    /// Booking overlaps with another booking.
    BookingConflict = 4102,

    /// Booking must be active for this operation.
    BookingNotActive = 4103,

    /// Booking expired.
    BookingExpired = 4104,

    /// Booking already cancelled.
    BookingAlreadyCancelled = 4105,

    /// Booking already completed.
    BookingAlreadyCompleted = 4106,

    /// Member balance insufficient for payment.
    InsufficientBalance = 4107,

    // -----------------------------
    // Workspace Errors (4200–4299)
    // -----------------------------
    /// Workspace ID not found.
    WorkspaceNotFound = 4200,

    /// Workspace already exists.
    WorkspaceAlreadyExists = 4201,

    /// Workspace currently unavailable.
    WorkspaceUnavailable = 4202,

    /// Cannot modify workspace while active bookings exist.
    WorkspaceHasActiveBookings = 4203,
}
