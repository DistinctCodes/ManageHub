// contracts/sandbox/event_ticketing/src/lib.rs
#![no_std]

mod errors;
mod types;

pub use errors::Error;
pub use types::{Event, EventStatus, Ticket, TicketStatus};

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Contract administrator address.
    Admin,
    /// Address of the payment token contract.
    PaymentToken,
    /// Event record keyed by event ID.
    Event(String),
    /// Ordered list of all event IDs.
    EventList,
    /// Ticket record keyed by ticket ID.
    Ticket(String),
    /// List of ticket IDs for a given event.
    EventTickets(String),
    /// List of ticket IDs owned by an address.
    OwnerTickets(Address),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EventTicketingContract;

#[contractimpl]
impl EventTicketingContract {
    /// Initialise the contract, setting the admin and payment token.
    /// Can only be called once.
    pub fn initialize(
        env: Env,
        admin: Address,
        payment_token: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        Ok(())
    }
}
