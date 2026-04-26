use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    // General errors (1–9)
    /// No admin has been set yet.
    AdminNotSet = 1,
    /// Caller is not authorized.
    Unauthorized = 2,
    /// Contract already initialized.
    AlreadyInitialized = 3,
    /// Payment token not configured.
    PaymentTokenNotSet = 4,
    /// Invalid time range (start_time >= end_time).
    InvalidTimeRange = 5,
    /// Capacity must be greater than zero.
    InvalidCapacity = 6,
    /// Ticket price must be greater than zero.
    InvalidPrice = 7,

    // Event errors (100–199)
    /// Event ID not found.
    EventNotFound = 100,
    /// Event already exists with the given ID.
    EventAlreadyExists = 101,
    /// Event is not in Active status.
    EventNotActive = 102,
    /// Event has no remaining capacity.
    EventSoldOut = 103,
    /// Event has been cancelled.
    EventCancelled = 104,

    // Ticket errors (200–299)
    /// Ticket ID not found.
    TicketNotFound = 200,
    /// Ticket already exists.
    TicketAlreadyExists = 201,
    /// Ticket cannot be transferred after event start.
    TicketNotTransferable = 202,
    /// Ticket cannot be cancelled after event start.
    TicketNotCancellable = 203,
}
