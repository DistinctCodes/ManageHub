use soroban_sdk::{contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EventStatus {
    Active,
    Cancelled,
    Ended,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum TicketStatus {
    Valid,
    Cancelled,
    Used,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Event {
    pub id: String,
    pub name: String,
    pub organizer: Address,
    pub start_time: u64,
    pub ticket_price: u128,
    pub capacity: u32,
    pub tickets_sold: u32,
    pub status: EventStatus,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Ticket {
    pub id: String,
    pub event_id: String,
    pub owner: Address,
    pub purchased_at: u64,
    pub status: TicketStatus,
}
