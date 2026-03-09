use soroban_sdk::{contracttype, Address, String};

/// Maximum allowed length for workspace identifiers.
pub const MAX_ID_LEN: u32 = 64;

/// Maximum allowed length for workspace names.
pub const MAX_NAME_LEN: u32 = 128;

/// Category of workspace being registered.
///
/// NOTE:
/// New variants may be added in future versions.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum WorkspaceType {
    /// Open hot-desk — shared, no dedicated assignment.
    HotDesk,

    /// Reserved desk for a specific member or team.
    DedicatedDesk,

    /// Enclosed private office.
    PrivateOffice,

    /// Meeting / conference room.
    MeetingRoom,

    /// Fully remote / online meeting space.
    Virtual,

    /// Combined physical desk and integrated video-conferencing setup.
    Hybrid,
}

/// Reason a workspace is unavailable.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum UnavailabilityReason {
    /// Temporary maintenance work
    Maintenance,

    /// Workspace permanently removed
    Decommissioned,

    /// Held by administrator
    AdminHold,
}

/// Availability state of a workspace.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum WorkspaceAvailability {
    /// Workspace can be booked
    Available,

    /// Workspace cannot be booked with reason
    Unavailable(UnavailabilityReason),
}

/// Lifecycle state of a booking.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum BookingStatus {
    /// Booking is confirmed and currently active.
    Active,

    /// Booking finished successfully.
    Completed,

    /// Booking cancelled by member or admin.
    Cancelled,

    /// Member never showed up for the reservation.
    NoShow,

    /// Reservation window passed without completion.
    Expired,
}

/// A physical or logical workspace that can be booked.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Workspace {
    /// Unique workspace identifier (max 64 chars)
    pub id: String,

    /// Human-readable name (max 128 chars)
    pub name: String,

    /// Category of workspace
    pub workspace_type: WorkspaceType,

    /// Maximum simultaneous occupants
    pub capacity: u32,

    /// Hourly rate in smallest unit of payment token
    pub hourly_rate: u128,

    /// Current availability state
    pub availability: WorkspaceAvailability,

    /// Ledger timestamp when workspace was created
    pub created_at: u64,
}

/// A confirmed reservation for a workspace.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Booking {
    /// Caller-provided booking identifier (max 64 chars)
    pub id: String,

    /// ID of workspace being booked
    pub workspace_id: String,

    /// Member who created the booking
    pub member: Address,

    /// Reservation start time (unix seconds)
    pub start_time: u64,

    /// Reservation end time (unix seconds)
    pub end_time: u64,

    /// Current booking lifecycle status
    pub status: BookingStatus,

    /// Amount paid for booking
    pub amount_paid: u128,

    /// Timestamp when booking was created
    pub created_at: u64,

    /// Timestamp booking was cancelled
    pub cancelled_at: Option<u64>,

    /// Timestamp booking was completed
    pub completed_at: Option<u64>,
}