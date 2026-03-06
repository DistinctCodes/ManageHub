// contracts/workspace_booking/src/lib.rs
#![no_std]
// The env.events().publish() API is deprecated in favour of #[contractevent],
// but kept here for consistency with the rest of the ManageHub contracts.
#![allow(deprecated)]

mod errors;
mod types;

// #[cfg(test)]
// mod test;

pub use errors::Error;
pub use types::{Booking, BookingStatus, Workspace, WorkspaceType};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, String, Vec};

// ── Storage keys ──────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Contract administrator address.
    Admin,
    /// Address of the USDC / payment token contract.
    PaymentToken,
    /// Workspace record keyed by workspace ID.
    Workspace(String),
    /// Ordered list of all registered workspace IDs.
    WorkspaceList,
    /// Booking record keyed by booking ID.
    Booking(String),
    /// List of booking IDs associated with a member.
    MemberBookings(Address),
    /// List of booking IDs associated with a workspace.
    WorkspaceBookings(String),
}

// ── Contract ──────────────────────────────────────────────────────────────────
#[contract]
pub struct WorkspaceBookingContract;

#[contractimpl]
impl WorkspaceBookingContract {
    // ── Internal helpers ──────────────────────────────────────────────────────

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

    /// Returns `true` if no active booking for `workspace_id` overlaps
    /// [`start_time`, `end_time`).
    fn is_slot_available(env: &Env, workspace_id: &String, start_time: u64, end_time: u64) -> bool {
        let booking_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::WorkspaceBookings(workspace_id.clone()))
            .unwrap_or(Vec::new(env));

        for i in 0..booking_ids.len() {
            let bid = booking_ids.get(i).unwrap();
            let booking: Booking = match env.storage().persistent().get(&DataKey::Booking(bid)) {
                Some(b) => b,
                None => continue,
            };

            if booking.status != BookingStatus::Active {
                continue;
            }

            // Overlap: existing booking starts before new slot ends AND ends after new slot starts.
            if booking.start_time < end_time && booking.end_time > start_time {
                return false;
            }
        }
        true
    }
}
