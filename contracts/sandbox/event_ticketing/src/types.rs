use soroban_sdk::{contracttype, Address, String};

/// Lifecycle status of an event.
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

/// An event that members can purchase tickets for.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    /// Unique event identifier.
    pub id: String,
    /// Human-readable event name.
    pub name: String,
    /// Unix timestamp when the event starts.
    pub start_time: u64,
    /// Price per ticket in smallest payment-token units.
    pub ticket_price: u128,
    /// Total ticket capacity.
    pub capacity: u32,
    /// Remaining tickets available.
    pub remaining_capacity: u32,
    /// Current event status.
    pub status: EventStatus,
    /// Ledger timestamp when event was created.
    pub created_at: u64,
}

/// Lifecycle status of a ticket.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TicketStatus {
    /// Ticket is valid and owned.
    Active,
    /// Ticket has been cancelled and refunded.
    Cancelled,
}

/// A ticket purchased for an event.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Ticket {
    /// Unique ticket identifier.
    pub id: String,
    /// ID of the event this ticket belongs to.
    pub event_id: String,
    /// Current owner of the ticket.
    pub owner: Address,
    /// Price paid for this ticket.
    pub price_paid: u128,
    /// Current ticket status.
    pub status: TicketStatus,
    /// Ledger timestamp when ticket was purchased.
    pub purchased_at: u64,
}
