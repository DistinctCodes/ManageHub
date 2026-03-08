use soroban_sdk::contracterror;

/// Contract error definitions.
///
/// Error codes are stable and should never be reordered.
/// Reserved ranges are used for future compatibility.
///
/// 1–99   → Core contract errors  
/// 100–199 → Booking related errors  
/// 200–299 → Workspace related errors
#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {

    /// No admin has been set yet.
    AdminNotSet = 1,

    /// Caller is not authorized.
    Unauthorized = 2,

    /// Contract already initialized.
    AlreadyInitialized = 3,

    /// Payment token not configured.
    PaymentTokenNotSet = 4,

    /// Provided string exceeds allowed length.
    StringTooLong = 5,

    /// Workspace capacity must be >= 1.
    InvalidCapacity = 6,

    /// Hourly rate must be > 0.
    InvalidRate = 7,

    /// Invalid booking time window.
    InvalidTimeRange = 8,


    // -----------------------------
    // Booking Errors (100–199)
    // -----------------------------

    /// Booking ID not found.
    BookingNotFound = 100,

    /// Booking already exists.
    BookingAlreadyExists = 101,

    /// Booking overlaps with another booking.
    BookingConflict = 102,

    /// Booking must be active for this operation.
    BookingNotActive = 103,

    /// Booking expired.
    BookingExpired = 104,

    /// Booking already cancelled.
    BookingAlreadyCancelled = 105,

    /// Booking already completed.
    BookingAlreadyCompleted = 106,

    /// Member balance insufficient for payment.
    InsufficientBalance = 107,


    // -----------------------------
    // Workspace Errors (200–299)
    // -----------------------------

    /// Workspace ID not found.
    WorkspaceNotFound = 200,

    /// Workspace already exists.
    WorkspaceAlreadyExists = 201,

    /// Workspace currently unavailable.
    WorkspaceUnavailable = 202,

    /// Cannot modify workspace while active bookings exist.
    WorkspaceHasActiveBookings = 203,
}