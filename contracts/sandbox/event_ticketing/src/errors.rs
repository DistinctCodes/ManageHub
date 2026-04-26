use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    AdminNotSet = 2,
    Unauthorized = 3,
    EventNotFound = 4,
    EventAlreadyExists = 5,
    EventCancelled = 6,
    EventNotActive = 7,
    SoldOut = 8,
    TicketNotFound = 9,
    TicketNotValid = 10,
    TransferAfterStart = 11,
    PaymentTokenNotSet = 12,
    InvalidTimeRange = 13,
}
