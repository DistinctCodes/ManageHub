use crate::errors::Error;
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum DataKey {
    EventLogsByEvent(BytesN<32>),
    EventLogsByUser(Address),
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct EventLog {
    pub event_id: BytesN<32>,
    pub user: Address,
    pub timestamp: u64,
    pub details: Map<String, String>,
}

pub struct AttendanceLogModule;

impl AttendanceLogModule {
    pub fn log_event(
        env: Env,
        event_id: BytesN<32>,
        user: Address,
        event_details: Map<String, String>,
    ) -> Result<(), Error> {
        // Optional validation on details size to integrate with errors
        if event_details.len() > 50 {
            return Err(Error::InvalidEventDetails);
        }

        let timestamp = env.ledger().timestamp();

        let log = EventLog {
            event_id: event_id.clone(),
            user: user.clone(),
            timestamp,
            details: event_details.clone(),
        };

        // Append immutably to per-event log list
        let mut by_event: Vec<EventLog> = env
            .storage()
            .persistent()
            .get(&DataKey::EventLogsByEvent(event_id.clone()))
            .unwrap_or(Vec::new(&env));
        by_event.push_back(log.clone());
        env.storage()
            .persistent()
            .set(&DataKey::EventLogsByEvent(event_id.clone()), &by_event);

        // Append immutably to per-user log list
        let mut by_user: Vec<EventLog> = env
            .storage()
            .persistent()
            .get(&DataKey::EventLogsByUser(user.clone()))
            .unwrap_or(Vec::new(&env));
        by_user.push_back(log.clone());
        env.storage()
            .persistent()
            .set(&DataKey::EventLogsByUser(user.clone()), &by_user);

        // Emit event for off-chain indexing
        env.events()
            .publish((symbol_short!("rsvp"), event_id, user), event_details);

        Ok(())
    }

    pub fn get_events_by_event(env: Env, event_id: BytesN<32>) -> Vec<EventLog> {
        env.storage()
            .persistent()
            .get(&DataKey::EventLogsByEvent(event_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_events_by_user(env: Env, user: Address) -> Vec<EventLog> {
        env.storage()
            .persistent()
            .get(&DataKey::EventLogsByUser(user))
            .unwrap_or(Vec::new(&env))
    }
}
