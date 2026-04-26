#![no_std]
#![allow(deprecated)]

mod errors;
mod types;

pub use errors::Error;
pub use types::{Event, EventStatus, Ticket, TicketStatus};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, String, Vec};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Event(String),
    EventList,
    Ticket(String),
    /// All ticket IDs for an event.
    EventTickets(String),
    /// All ticket IDs owned by an address.
    OwnerTickets(Address),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EventTicketingContract;

#[contractimpl]
impl EventTicketingContract {
    // ── Helpers ───────────────────────────────────────────────────────────────

    fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin = Self::get_admin(env)?;
        if caller != &admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    fn get_payment_token(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .ok_or(Error::PaymentTokenNotSet)
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);
        env.events().publish((symbol_short!("init"),), (admin, payment_token));
        Ok(())
    }

    // ── Event management (admin-only) ─────────────────────────────────────────

    pub fn create_event(
        env: Env,
        caller: Address,
        event_id: String,
        name: String,
        start_time: u64,
        ticket_price: u128,
        capacity: u32,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        if env.storage().persistent().has(&DataKey::Event(event_id.clone())) {
            return Err(Error::EventAlreadyExists);
        }

        let event = Event {
            id: event_id.clone(),
            name: name.clone(),
            start_time,
            ticket_price,
            capacity,
            remaining_capacity: capacity,
            status: EventStatus::Active,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Event(event_id.clone()), &event);

        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::EventList)
            .unwrap_or(Vec::new(&env));
        list.push_back(event_id.clone());
        env.storage().instance().set(&DataKey::EventList, &list);

        env.events().publish((symbol_short!("ev_create"), event_id), (name, start_time, ticket_price, capacity));
        Ok(())
    }

    // ── CT-10: Buy ticket ─────────────────────────────────────────────────────

    pub fn buy_ticket(
        env: Env,
        buyer: Address,
        ticket_id: String,
        event_id: String,
    ) -> Result<(), Error> {
        buyer.require_auth();

        if env.storage().persistent().has(&DataKey::Ticket(ticket_id.clone())) {
            return Err(Error::TicketAlreadyExists);
        }

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if event.status != EventStatus::Active {
            return Err(Error::EventNotActive);
        }
        if event.remaining_capacity == 0 {
            return Err(Error::EventSoldOut);
        }

        // Transfer ticket_price from buyer to contract.
        let payment_token = Self::get_payment_token(&env)?;
        token::Client::new(&env, &payment_token).transfer(
            &buyer,
            &env.current_contract_address(),
            &(event.ticket_price as i128),
        );

        // Decrement capacity.
        event.remaining_capacity -= 1;
        env.storage().persistent().set(&DataKey::Event(event_id.clone()), &event);

        // Store ticket.
        let ticket = Ticket {
            id: ticket_id.clone(),
            event_id: event_id.clone(),
            owner: buyer.clone(),
            price_paid: event.ticket_price,
            status: TicketStatus::Active,
            purchased_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Ticket(ticket_id.clone()), &ticket);

        // Index: event → tickets.
        let mut ev_tickets: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::EventTickets(event_id.clone()))
            .unwrap_or(Vec::new(&env));
        ev_tickets.push_back(ticket_id.clone());
        env.storage().persistent().set(&DataKey::EventTickets(event_id.clone()), &ev_tickets);

        // Index: owner → tickets.
        let mut owner_tickets: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerTickets(buyer.clone()))
            .unwrap_or(Vec::new(&env));
        owner_tickets.push_back(ticket_id.clone());
        env.storage().persistent().set(&DataKey::OwnerTickets(buyer.clone()), &owner_tickets);

        env.events().publish(
            (symbol_short!("purchase"), ticket_id),
            (buyer, event_id, event.ticket_price),
        );
        Ok(())
    }

    // ── CT-11: Transfer ticket ────────────────────────────────────────────────

    pub fn transfer_ticket(
        env: Env,
        from: Address,
        to: Address,
        ticket_id: String,
    ) -> Result<(), Error> {
        from.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id.clone()))
            .ok_or(Error::TicketNotFound)?;

        if ticket.owner != from {
            return Err(Error::Unauthorized);
        }

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if env.ledger().timestamp() >= event.start_time {
            return Err(Error::TicketNotTransferable);
        }

        // Re-index: remove from old owner, add to new owner.
        let mut from_tickets: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerTickets(from.clone()))
            .unwrap_or(Vec::new(&env));
        let mut new_from: Vec<String> = Vec::new(&env);
        for i in 0..from_tickets.len() {
            let t = from_tickets.get(i).unwrap();
            if t != ticket_id {
                new_from.push_back(t);
            }
        }
        env.storage().persistent().set(&DataKey::OwnerTickets(from.clone()), &new_from);

        let mut to_tickets: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::OwnerTickets(to.clone()))
            .unwrap_or(Vec::new(&env));
        to_tickets.push_back(ticket_id.clone());
        env.storage().persistent().set(&DataKey::OwnerTickets(to.clone()), &to_tickets);

        ticket.owner = to.clone();
        env.storage().persistent().set(&DataKey::Ticket(ticket_id.clone()), &ticket);

        env.events().publish(
            (symbol_short!("transfer"), ticket_id),
            (from, to, ticket.event_id),
        );
        Ok(())
    }

    // ── CT-12: Cancel ticket ──────────────────────────────────────────────────

    pub fn cancel_ticket(env: Env, caller: Address, ticket_id: String) -> Result<(), Error> {
        caller.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id.clone()))
            .ok_or(Error::TicketNotFound)?;

        let admin = Self::get_admin(&env)?;
        if caller != ticket.owner && caller != admin {
            return Err(Error::Unauthorized);
        }

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if env.ledger().timestamp() >= event.start_time {
            return Err(Error::TicketNotCancellable);
        }

        // Refund ticket_price from contract to ticket owner.
        let payment_token = Self::get_payment_token(&env)?;
        token::Client::new(&env, &payment_token).transfer(
            &env.current_contract_address(),
            &ticket.owner,
            &(ticket.price_paid as i128),
        );

        // Restore capacity.
        event.remaining_capacity += 1;
        env.storage().persistent().set(&DataKey::Event(ticket.event_id.clone()), &event);

        ticket.status = TicketStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Ticket(ticket_id.clone()), &ticket);

        env.events().publish(
            (symbol_short!("cancel"), ticket_id),
            (caller, ticket.event_id, ticket.price_paid),
        );
        Ok(())
    }

    // ── CT-13: Query functions ────────────────────────────────────────────────

    pub fn get_event(env: Env, event_id: String) -> Result<Event, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)
    }

    pub fn get_all_events(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::EventList)
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_ticket(env: Env, ticket_id: String) -> Result<Ticket, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .ok_or(Error::TicketNotFound)
    }

    pub fn get_event_tickets(env: Env, event_id: String) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::EventTickets(event_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_owner_tickets(env: Env, owner: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::OwnerTickets(owner))
            .unwrap_or(Vec::new(&env))
    }

    pub fn check_event_availability(env: Env, event_id: String) -> bool {
        let event: Event = match env.storage().persistent().get(&DataKey::Event(event_id)) {
            Some(e) => e,
            None => return false,
        };
        event.status == EventStatus::Active && event.remaining_capacity > 0
    }
}
