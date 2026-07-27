// contracts/workspace_booking/src/lib.rs
#![no_std]

mod errors;
mod types;

#[cfg(test)]
mod test;

#[cfg(test)]
mod proptest_tests;

pub use errors::Error;
pub use types::{
    Booking, BookingStatus, UnavailabilityReason, Workspace, WorkspaceAvailability, WorkspaceType,
};

use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, token, Address, Env, String, Vec,
};

/// Keep workspace/booking records for ~30 days (in ledgers; ~1 ledger / 5 s).
const BOOKING_TTL_LEDGERS: u32 = 518_400;

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
    /// Whether the contract is paused.
    ContractPaused,
}

// ── Contract Events (#[contractevent]) ────────────────────────────────────────

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct ContractInitialized {
    pub admin: Address,
    pub payment_token: Address,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct WorkspaceRegistered {
    pub id: String,
    pub name: String,
    pub workspace_type: WorkspaceType,
    pub capacity: u32,
    pub hourly_rate: u128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct WorkspaceAvailabilityChanged {
    pub workspace_id: String,
    pub is_available: bool,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct WorkspaceRateChanged {
    pub workspace_id: String,
    pub hourly_rate: u128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct WorkspaceBooked {
    pub booking_id: String,
    pub member: Address,
    pub workspace_id: String,
    pub start_time: u64,
    pub end_time: u64,
    pub amount: u128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct BookingCancelled {
    pub booking_id: String,
    pub caller: Address,
    pub refund_amount: u128,
}

#[contractevent]
#[derive(Clone, Debug, PartialEq)]
pub struct BookingCompleted {
    pub booking_id: String,
    pub workspace_id: String,
    pub member: Address,
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

    fn require_not_paused(env: &Env) -> Result<(), Error> {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::ContractPaused)
            .unwrap_or(false);
        if paused {
            return Err(Error::ContractPaused);
        }
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
        // SAFETY: requires auth
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);

        ContractInitialized { admin, payment_token }.publish(&env);
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
        hourly_rate: u128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_admin(&env, &caller)?;

        if capacity == 0 {
            return Err(Error::InvalidCapacity);
        }
        if hourly_rate == 0 {
            return Err(Error::InvalidRate);
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Workspace(id.clone()))
        {
            return Err(Error::WorkspaceAlreadyExists);
        }

        let workspace = Workspace {
            id: id.clone(),
            name: name.clone(),
            workspace_type: workspace_type.clone(),
            capacity,
            hourly_rate,
            availability: WorkspaceAvailability::Available,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Workspace(id.clone()), &workspace);
        env.storage().persistent().extend_ttl(
            &DataKey::Workspace(id.clone()),
            BOOKING_TTL_LEDGERS,
            BOOKING_TTL_LEDGERS,
        );

        let mut list: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::WorkspaceList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        env.storage().instance().set(&DataKey::WorkspaceList, &list);

        WorkspaceRegistered { id, name, workspace_type, capacity, hourly_rate }.publish(&env);
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
        Self::require_not_paused(&env)?;
        Self::require_admin(&env, &caller)?;

        let mut workspace: Workspace = env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
            .ok_or(Error::WorkspaceNotFound)?;

        workspace.availability = if is_available {
            WorkspaceAvailability::Available
        } else {
            WorkspaceAvailability::Unavailable(UnavailabilityReason::AdminHold)
        };
        env.storage()
            .persistent()
            .set(&DataKey::Workspace(workspace_id.clone()), &workspace);

        WorkspaceAvailabilityChanged { workspace_id, is_available }.publish(&env);
        Ok(())
    }

    /// Update the hourly rate for a workspace (applies to future bookings only).
    pub fn set_workspace_rate(
        env: Env,
        caller: Address,
        workspace_id: String,
        hourly_rate: u128,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_admin(&env, &caller)?;

        if hourly_rate == 0 {
            return Err(Error::InvalidRate);
        }

        let mut workspace: Workspace = env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
            .ok_or(Error::WorkspaceNotFound)?;

        workspace.hourly_rate = hourly_rate;
        env.storage()
            .persistent()
            .set(&DataKey::Workspace(workspace_id.clone()), &workspace);

        WorkspaceRateChanged { workspace_id, hourly_rate }.publish(&env);
        Ok(())
    }

    // ── Booking ───────────────────────────────────────────────────────────────

    /// Reserve a workspace for a time slot.
    ///
    /// The caller must have pre-approved the contract to spend `amount` of the
    /// payment token (or the caller's auth tree must cover the sub-invocation).
    /// Cost is rounded **up** to the nearest full hour.
    ///
    /// * `booking_id`   – unique ID chosen by the caller (e.g. a UUID).
    /// * `workspace_id` – workspace to book.
    /// * `start_time`   – Unix timestamp (seconds) for start of reservation.
    /// * `end_time`     – Unix timestamp (seconds) for end of reservation.
    pub fn book_workspace(
        env: Env,
        member: Address,
        booking_id: String,
        workspace_id: String,
        start_time: u64,
        end_time: u64,
    ) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        member.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::Booking(booking_id.clone()))
        {
            return Err(Error::BookingAlreadyExists);
        }

        let now = env.ledger().timestamp();

        if start_time >= end_time || end_time <= now {
            return Err(Error::InvalidTimeRange);
        }

        let workspace: Workspace = env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
            .ok_or(Error::WorkspaceNotFound)?;

        if workspace.availability != WorkspaceAvailability::Available {
            return Err(Error::WorkspaceUnavailable);
        }

        if !Self::is_slot_available(&env, &workspace_id, start_time, end_time) {
            return Err(Error::BookingConflict);
        }

        // Cost = hourly_rate × ⌈duration_seconds / 3600⌉
        let duration_secs = end_time - start_time;
        let duration_hours = duration_secs.div_ceil(3600);
        let amount: u128 = workspace
            .hourly_rate
            .checked_mul(duration_hours as u128)
            .ok_or(Error::Overflow)?;

        // Collect payment from member → contract
        let payment_token = Self::get_payment_token(&env)?;
        token::Client::new(&env, &payment_token).transfer(
            &member,
            env.current_contract_address(),
            &(amount as i128),
        );

        let booking = Booking {
            id: booking_id.clone(),
            workspace_id: workspace_id.clone(),
            member: member.clone(),
            start_time,
            end_time,
            status: BookingStatus::Active,
            amount_paid: amount,
            created_at: now,
            cancelled_at: None,
            completed_at: None,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id.clone()), &booking);
        env.storage().persistent().extend_ttl(
            &DataKey::Booking(booking_id.clone()),
            BOOKING_TTL_LEDGERS,
            BOOKING_TTL_LEDGERS,
        );

        // Index: workspace → bookings
        let mut ws_bookings: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::WorkspaceBookings(workspace_id.clone()))
            .unwrap_or(Vec::new(&env));
        ws_bookings.push_back(booking_id.clone());
        env.storage().persistent().set(
            &DataKey::WorkspaceBookings(workspace_id.clone()),
            &ws_bookings,
        );
        env.storage().persistent().extend_ttl(
            &DataKey::WorkspaceBookings(workspace_id.clone()),
            BOOKING_TTL_LEDGERS,
            BOOKING_TTL_LEDGERS,
        );

        // Index: member → bookings
        let mut member_bookings: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::MemberBookings(member.clone()))
            .unwrap_or(Vec::new(&env));
        member_bookings.push_back(booking_id.clone());
        env.storage()
            .persistent()
            .set(&DataKey::MemberBookings(member.clone()), &member_bookings);
        env.storage().persistent().extend_ttl(
            &DataKey::MemberBookings(member.clone()),
            BOOKING_TTL_LEDGERS,
            BOOKING_TTL_LEDGERS,
        );

        WorkspaceBooked { booking_id, member, workspace_id, start_time, end_time, amount }.publish(&env);
        Ok(())
    }

    /// Cancel an active booking and refund the full amount to the member.
    ///
    /// Only the booking member or the admin may cancel.
    pub fn cancel_booking(env: Env, caller: Address, booking_id: String) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        caller.require_auth();

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id.clone()))
            .ok_or(Error::BookingNotFound)?;

        let admin = Self::get_admin(&env)?;
        if caller != booking.member && caller != admin {
            return Err(Error::Unauthorized);
        }
        if booking.status != BookingStatus::Active {
            return Err(Error::BookingNotActive);
        }

        // Refund payment from contract → member
        let payment_token = Self::get_payment_token(&env)?;
        token::Client::new(&env, &payment_token).transfer(
            &env.current_contract_address(),
            &booking.member,
            &(booking.amount_paid as i128),
        );

        let refund_amount = booking.amount_paid;
        booking.status = BookingStatus::Cancelled;
        booking.cancelled_at = Some(env.ledger().timestamp());
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id.clone()), &booking);

        BookingCancelled { booking_id, caller, refund_amount }.publish(&env);
        Ok(())
    }

    /// Mark an active booking as completed (admin only).
    ///
    /// Call this after the member has checked out to close the booking record.
    pub fn complete_booking(env: Env, caller: Address, booking_id: String) -> Result<(), Error> {
        Self::require_not_paused(&env)?;
        Self::require_admin(&env, &caller)?;

        let mut booking: Booking = env
            .storage()
            .persistent()
            .get(&DataKey::Booking(booking_id.clone()))
            .ok_or(Error::BookingNotFound)?;

        if booking.status != BookingStatus::Active {
            return Err(Error::BookingNotActive);
        }

        let workspace_id = booking.workspace_id.clone();
        let member = booking.member.clone();

        booking.status = BookingStatus::Completed;
        booking.completed_at = Some(env.ledger().timestamp());
        env.storage()
            .persistent()
            .set(&DataKey::Booking(booking_id.clone()), &booking);

        BookingCompleted { booking_id, workspace_id, member }.publish(&env);
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

    /// Fetch a booking record by ID.
    pub fn get_booking(env: Env, booking_id: String) -> Result<Booking, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Booking(booking_id))
            .ok_or(Error::BookingNotFound)
    }

    /// Return all registered workspace IDs (in registration order).
    pub fn get_all_workspaces(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::WorkspaceList)
            .unwrap_or(Vec::new(&env))
    }

    /// Return all booking IDs made by a specific member.
    pub fn get_member_bookings(env: Env, member: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::MemberBookings(member))
            .unwrap_or(Vec::new(&env))
    }

    /// Return all booking IDs associated with a specific workspace.
    pub fn get_workspace_bookings(env: Env, workspace_id: String) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::WorkspaceBookings(workspace_id))
            .unwrap_or(Vec::new(&env))
    }

    /// Check whether a workspace has no conflicting active booking in the
    /// requested slot. Returns `false` if the workspace does not exist or is
    /// marked unavailable.
    pub fn check_availability(
        env: Env,
        workspace_id: String,
        start_time: u64,
        end_time: u64,
    ) -> bool {
        let workspace: Workspace = match env
            .storage()
            .persistent()
            .get(&DataKey::Workspace(workspace_id.clone()))
        {
            Some(ws) => ws,
            None => return false,
        };

        if workspace.availability != WorkspaceAvailability::Available {
            return false;
        }

        Self::is_slot_available(&env, &workspace_id, start_time, end_time)
    }

    /// Return the current admin address.
    pub fn admin(env: Env) -> Result<Address, Error> {
        Self::get_admin(&env)
    }

    /// Return the payment token address.
    pub fn payment_token(env: Env) -> Result<Address, Error> {
        Self::get_payment_token(&env)
    }

    // ── Pause controls ────────────────────────────────────────────────────────

    /// Pause all state-changing operations (admin only).
    pub fn pause(env: Env, caller: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage()
            .instance()
            .set(&DataKey::ContractPaused, &true);
        env.events()
            .publish((symbol_short!("pause"),), (caller, env.ledger().timestamp()));
        Ok(())
    }

    /// Resume state-changing operations (admin only).
    pub fn unpause(env: Env, caller: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage()
            .instance()
            .set(&DataKey::ContractPaused, &false);
        env.events()
            .publish((symbol_short!("unpause"),), (caller, env.ledger().timestamp()));
        Ok(())
    }

    /// Whether the contract is currently paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::ContractPaused)
            .unwrap_or(false)
    }
}
