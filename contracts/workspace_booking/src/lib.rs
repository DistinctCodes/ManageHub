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

    // ── Initialisation ────────────────────────────────────────────────────────

    /// One-time setup. Sets the admin and the payment token address.
    pub fn initialize(env: Env, admin: Address, payment_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PaymentToken, &payment_token);

        env.events().publish(
            (symbol_short!("init"),),
            (admin, payment_token),
        );
        Ok(())
    }

    // ── Workspace management (admin-only) ─────────────────────────────────────

    /// Register a new bookable workspace.
    ///
    /// * `id`             – unique identifier for this workspace.
    /// * `name`           – human-readable name.
    /// * `workspace_type` – category (HotDesk / DedicatedDesk / PrivateOffice / MeetingRoom).
    /// * `capacity`       – max simultaneous occupants (≥ 1).
    /// * `hourly_rate`    – price per hour in smallest payment-token units (> 0).
    pub fn register_workspace(
        env: Env,
        caller: Address,
        id: String,
        name: String,
        workspace_type: WorkspaceType,
        capacity: u32,
        hourly_rate: i128,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        if capacity == 0 {
            return Err(Error::InvalidCapacity);
        }
        if hourly_rate <= 0 {
            return Err(Error::InvalidRate);
        }
        if env.storage().persistent().has(&DataKey::Workspace(id.clone())) {
            return Err(Error::WorkspaceAlreadyExists);
        }

        let workspace = Workspace {
            id: id.clone(),
            name: name.clone(),
            workspace_type: workspace_type.clone(),
            capacity,
            hourly_rate,
            is_available: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Workspace(id.clone()), &workspace);

        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::WorkspaceList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().instance().set(&DataKey::WorkspaceList, &list);

        env.events().publish(
            (symbol_short!("ws_reg"), id),
            (name, workspace_type, capacity, hourly_rate),
        );
        Ok(())
    }

    /// Toggle a workspace's availability. Unavailable workspaces cannot accept
    /// new bookings but existing active bookings are unaffected.
    pub fn set_workspace_availability(
        env: Env,
        caller: Address,
        workspace_id: String,
        is_available: bool,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let mut workspace: Workspace = env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
            .ok_or(Error::WorkspaceNotFound)?;

        workspace.is_available = is_available;
        env.storage().persistent().set(&DataKey::Workspace(workspace_id.clone()), &workspace);

        env.events().publish(
            (symbol_short!("ws_avail"), workspace_id),
            (is_available,),
        );
        Ok(())
    }

    /// Update the hourly rate for a workspace (applies to future bookings only).
    pub fn set_workspace_rate(
        env: Env,
        caller: Address,
        workspace_id: String,
        hourly_rate: i128,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        if hourly_rate <= 0 {
            return Err(Error::InvalidRate);
        }

        let mut workspace: Workspace = env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
            .ok_or(Error::WorkspaceNotFound)?;

        workspace.hourly_rate = hourly_rate;
        env.storage().persistent().set(&DataKey::Workspace(workspace_id.clone()), &workspace);

        env.events().publish(
            (symbol_short!("ws_rate"), workspace_id),
            (hourly_rate,),
        );
        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Fetch a workspace record by ID.
    pub fn get_workspace(env: Env, workspace_id: String) -> Result<Workspace, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id))
            .ok_or(Error::WorkspaceNotFound)
    }

    /// Return all registered workspace IDs (in registration order).
    pub fn get_all_workspaces(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::WorkspaceList)
            .unwrap_or(Vec::new(&env))
    }

    /// Return the current admin address.
    pub fn admin(env: Env) -> Result<Address, Error> {
        Self::get_admin(&env)
    }

    /// Return the payment token address.
    pub fn payment_token(env: Env) -> Result<Address, Error> {
        Self::get_payment_token(&env)
    }
}
