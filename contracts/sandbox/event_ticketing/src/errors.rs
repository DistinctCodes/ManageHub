use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// No admin has been set yet.
    AdminNotSet = 1,
    /// Contract already initialized.
    AlreadyInitialized = 2,
    /// Caller is not authorized.
    Unauthorized = 3,
    /// Requested event does not exist.
    EventNotFound = 4,
    /// Requested ticket does not exist.
    TicketNotFound = 5,
    /// Event has no remaining ticket capacity.
    EventSoldOut = 6,
    /// Event is not in Active status.
    EventNotActive = 7,
    /// start_time must be before end_time.
    InvalidTimeRange = 8,
    /// Ticket price must be greater than zero.
    InvalidPrice = 9,
    /// This ticket cannot be transferred.
    TicketNotTransferable = 10,
}
