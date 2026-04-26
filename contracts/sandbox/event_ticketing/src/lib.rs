#![no_std]
#![allow(deprecated)]

mod errors;
mod types;

#[cfg(test)]
mod test;

pub use errors::Error;
pub use types::{Event, EventStatus, Ticket, TicketStatus};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, String};

#[contracttype]
pub enum DataKey {
    Admin,
    PaymentToken,
    Event(String),
    Ticket(String),
}

#[contract]
pub struct EventTicketingContract;

#[contractimpl]
impl EventTicketingContract {
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

    pub fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
        env.events()
            .publish((symbol_short!("init"),), (admin, payment_token));
        Ok(())
    }

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

        if capacity == 0 || start_time == 0 {
            return Err(Error::InvalidTimeRange);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Event(event_id.clone()))
        {
            return Err(Error::EventAlreadyExists);
        }

        let event = Event {
            id: event_id.clone(),
            name: name.clone(),
            organizer: caller.clone(),
            start_time,
            ticket_price,
            capacity,
            tickets_sold: 0,
            status: EventStatus::Active,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id.clone()), &event);
        env.events()
            .publish((symbol_short!("ev_create"), event_id), (name, capacity));
        Ok(())
    }

    pub fn cancel_event(env: Env, caller: Address, event_id: String) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if event.status != EventStatus::Active {
            return Err(Error::EventNotActive);
        }
        event.status = EventStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id.clone()), &event);
        env.events()
            .publish((symbol_short!("ev_cancel"), event_id), (caller,));
        Ok(())
    }

    pub fn buy_ticket(
        env: Env,
        buyer: Address,
        event_id: String,
        ticket_id: String,
    ) -> Result<(), Error> {
        buyer.require_auth();

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if event.status == EventStatus::Cancelled {
            return Err(Error::EventCancelled);
        }
        if event.status != EventStatus::Active {
            return Err(Error::EventNotActive);
        }
        if event.tickets_sold >= event.capacity {
            return Err(Error::SoldOut);
        }

        let payment_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .ok_or(Error::PaymentTokenNotSet)?;

        token::Client::new(&env, &payment_token).transfer(
            &buyer,
            &env.current_contract_address(),
            &(event.ticket_price as i128),
        );

        event.tickets_sold += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id.clone()), &event);

        let ticket = Ticket {
            id: ticket_id.clone(),
            event_id: event_id.clone(),
            owner: buyer.clone(),
            purchased_at: env.ledger().timestamp(),
            status: TicketStatus::Valid,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id.clone()), &ticket);
        env.events()
            .publish((symbol_short!("buy"), ticket_id), (buyer, event_id));
        Ok(())
    }

    pub fn transfer_ticket(
        env: Env,
        caller: Address,
        ticket_id: String,
        new_owner: Address,
    ) -> Result<(), Error> {
        caller.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id.clone()))
            .ok_or(Error::TicketNotFound)?;

        if ticket.status != TicketStatus::Valid {
            return Err(Error::TicketNotValid);
        }
        if ticket.owner != caller {
            return Err(Error::Unauthorized);
        }

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        if env.ledger().timestamp() >= event.start_time {
            return Err(Error::TransferAfterStart);
        }

        ticket.owner = new_owner.clone();
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id.clone()), &ticket);
        env.events()
            .publish((symbol_short!("transfer"), ticket_id), (caller, new_owner));
        Ok(())
    }

    pub fn cancel_ticket(
        env: Env,
        caller: Address,
        ticket_id: String,
    ) -> Result<(), Error> {
        caller.require_auth();

        let mut ticket: Ticket = env
            .storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id.clone()))
            .ok_or(Error::TicketNotFound)?;

        if ticket.status != TicketStatus::Valid {
            return Err(Error::TicketNotValid);
        }
        if ticket.owner != caller {
            return Err(Error::Unauthorized);
        }

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(ticket.event_id.clone()))
            .ok_or(Error::EventNotFound)?;

        let payment_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .ok_or(Error::PaymentTokenNotSet)?;

        token::Client::new(&env, &payment_token).transfer(
            &env.current_contract_address(),
            &caller,
            &(event.ticket_price as i128),
        );

        ticket.status = TicketStatus::Cancelled;
        event.tickets_sold -= 1;
        env.storage()
            .persistent()
            .set(&DataKey::Ticket(ticket_id.clone()), &ticket);
        env.storage()
            .persistent()
            .set(&DataKey::Event(ticket.event_id.clone()), &event);
        env.events()
            .publish((symbol_short!("tk_cancel"), ticket_id), (caller,));
        Ok(())
    }

    pub fn get_event(env: Env, event_id: String) -> Result<Event, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)
    }

    pub fn get_ticket(env: Env, ticket_id: String) -> Result<Ticket, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Ticket(ticket_id))
            .ok_or(Error::TicketNotFound)
    }
}
