use soroban_sdk::{contracttype, Address, String};

/// Lifecycle state of an event.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EventStatus {
    /// Event is open for ticket purchases.
    Active,
    /// Event has been cancelled.
    Cancelled,
    /// Event has concluded.
    Completed,
}

/// Lifecycle state of a ticket.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TicketStatus {
    /// Ticket is valid and owned.
    Valid,
    /// Ticket has been used for entry.
    Used,
    /// Ticket has been refunded.
    Refunded,
}

/// An event that can have tickets purchased for it.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    /// Unique event identifier.
    pub id: String,
    /// Human-readable event name.
    pub name: String,
    /// Maximum number of tickets available.
    pub capacity: u32,
    /// Price per ticket in smallest payment token unit.
    pub ticket_price: u128,
    /// Event start time (unix seconds).
    pub start_time: u64,
    /// Event end time (unix seconds).
    pub end_time: u64,
    /// Current lifecycle status.
    pub status: EventStatus,
}

/// A ticket purchased for an event.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Ticket {
    /// Unique ticket identifier.
    pub id: String,
    /// ID of the event this ticket belongs to.
    pub event_id: String,
    /// Address of the ticket owner.
    pub owner: Address,
    /// Ledger timestamp when ticket was purchased.
    pub purchased_at: u64,
    /// Current ticket status.
    pub status: TicketStatus,
}
