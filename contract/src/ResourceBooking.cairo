/// ResourceBooking.cairo
/// Cairo 2 contract that manages resources and bookings with overlap prevention

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

#[derive(Drop, Serde, starknet::Store)]
struct RecurringBooking {
    user: ContractAddress,
    resource_id: u32,
    pattern: u8, // 0 = daily, 1 = weekly, 2 = monthly
    duration: u64,
    start_time: u64,
    is_active: bool,
    created_at: u64,
}

#[starknet::interface]
pub trait IResourceBooking<TContractState> {
    /// Create a new resource. Only contract owner can call.
    /// Returns unique resource_id.
    fn create_resource(ref self: TContractState, name: felt252, resource_type: u8) -> u32;

    /// Get resource info by id.
    fn get_resource_info(self: @TContractState, resource_id: u32) -> (name: felt252, resource_type: u8, is_available: bool);

    /// Book a resource for a time range. Prevents overlapping bookings.
    /// Returns unique booking_id.
    fn book_resource(ref self: TContractState, user: starknet::ContractAddress, resource_id: u32, start_time: u64, end_time: u64) -> u32;

    /// Cancel a booking by booking_id.
    fn cancel_booking(ref self: TContractState, booking_id: u32);

    /// Get resource availability for a specific date.
    fn get_resource_availability(self: @TContractState, resource_id: u32, date: u64) -> Array<(u64, u64)>;

    /// Create a recurring booking with specified pattern.
    fn create_recurring_booking(ref self: TContractState, user: starknet::ContractAddress, resource_id: u32, pattern: u8, duration: u64);

    /// Get booking info by booking_id.
    fn get_booking_info(self: @TContractState, booking_id: u32) -> (booker: starknet::ContractAddress, resource_id: u32, start_time: u64, end_time: u64, is_active: bool);
}

#[starknet::contract]
mod ResourceBooking {
    use super::{RecurringBooking, ContractAddress};
    use core::panic_with_felt252;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,

        // Resources
        resource_count: u32,
        resources_name: Map::<u32, felt252>,
        resources_type: Map::<u32, u8>,
        resources_available: Map::<u32, bool>,

        // Bookings
        booking_count: u32,
        booking_booker: Map::<u32, ContractAddress>,
        booking_resource_id: Map::<u32, u32>,
        booking_start: Map::<u32, u64>,
        booking_end: Map::<u32, u64>,
        booking_active: Map::<u32, bool>,

        // Per-resource booking index for overlap checks
        resource_booking_len: Map::<u32, u32>,
        resource_booking_at: Map::<(u32, u32), u32>, // (resource_id, idx) -> booking_id

        // Recurring bookings
        recurring_booking_count: u32,
        recurring_bookings: Map::<u32, RecurringBooking>,
        user_recurring_bookings: Map::<(ContractAddress, u32), u32>, // (user, index) -> recurring_id
        user_recurring_count: Map::<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ResourceCreated: ResourceCreated,
        ResourceBooked: ResourceBooked,
        BookingCancelled: BookingCancelled,
        RecurringBookingCreated: RecurringBookingCreated,
    }

    #[derive(Drop, starknet::Event)]
    struct ResourceCreated {
        resource_id: u32,
        name: felt252,
        resource_type: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct ResourceBooked {
        booking_id: u32,
        resource_id: u32,
        user: ContractAddress,
        start_time: u64,
        end_time: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BookingCancelled {
        booking_id: u32,
        user: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct RecurringBookingCreated {
        recurring_id: u32,
        user: ContractAddress,
        resource_id: u32,
        pattern: u8,
    }

    // Internal: only owner
    fn only_owner(self: @ContractState) {
        let caller = starknet::get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let owner = starknet::get_caller_address();
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl ResourceBookingImpl of super::IResourceBooking<ContractState> {
        fn create_resource(ref self: ContractState, name: felt252, resource_type: u8) -> u32 {
            self.only_owner();

            let id = self.resource_count.read();
            self.resource_count.write(id + 1);

            self.resources_name.write(id, name);
            self.resources_type.write(id, resource_type);
            self.resources_available.write(id, true);
            self.resource_booking_len.write(id, 0);

            self.emit(Event::ResourceCreated(ResourceCreated {
                resource_id: id,
                name,
                resource_type,
            }));
            id
        }

        fn get_resource_info(self: @ContractState, resource_id: u32) -> (name: felt252, resource_type: u8, is_available: bool) {
            let name = self.resources_name.read(resource_id);
            let rtype = self.resources_type.read(resource_id);
            let available = self.resources_available.read(resource_id);
            (name, rtype, available)
        }

        fn book_resource(ref self: ContractState, user: ContractAddress, resource_id: u32, start_time: u64, end_time: u64) -> u32 {
            // Basic validation
            assert(start_time < end_time, 'Invalid time');

            // Resource must exist (we check name presence by reading; default 0 is allowed, but rely on count)
            let current_count = self.resource_count.read();
            assert(resource_id < current_count, 'Invalid resource');

            // Check overlaps across existing bookings for the resource
            let mut i: u32 = 0;
            let len = self.resource_booking_len.read(resource_id);
            loop {
                if i >= len { break; };
                let bid = self.resource_booking_at.read((resource_id, i));
                let active = self.booking_active.read(bid);
                if active == true {
                    let s = self.booking_start.read(bid);
                    let e = self.booking_end.read(bid);
                    // overlap if (start_time < e) && (end_time > s)
                    if start_time < e && end_time > s {
                        // exact message required by acceptance criteria
                        panic_with_felt252('Resource not available');
                    }
                }
                i = i + 1;
            };

            // Create booking
            let booking_id = self.booking_count.read();
            self.booking_count.write(booking_id + 1);

            self.booking_booker.write(booking_id, user);
            self.booking_resource_id.write(booking_id, resource_id);
            self.booking_start.write(booking_id, start_time);
            self.booking_end.write(booking_id, end_time);
            self.booking_active.write(booking_id, true);

            // Index under resource
            let rlen = self.resource_booking_len.read(resource_id);
            self.resource_booking_at.write((resource_id, rlen), booking_id);
            self.resource_booking_len.write(resource_id, rlen + 1);

            self.emit(Event::ResourceBooked(ResourceBooked {
                booking_id,
                resource_id,
                user,
                start_time,
                end_time,
            }));
            booking_id
        }

        fn cancel_booking(ref self: ContractState, booking_id: u32) {
            let caller = get_caller_address();
            let booker = self.booking_booker.read(booking_id);
            let owner = self.owner.read();

            // Only the booker or owner can cancel
            assert(caller == booker || caller == owner, 'Not authorized');

            let is_active = self.booking_active.read(booking_id);
            assert(is_active, 'Booking not active');

            self.booking_active.write(booking_id, false);

            self.emit(Event::BookingCancelled(BookingCancelled {
                booking_id,
                user: booker,
            }));
        }

        fn get_resource_availability(self: @ContractState, resource_id: u32, date: u64) -> Array<(u64, u64)> {
            let mut availability = ArrayTrait::new();

            // Get day start and end (simplified)
            let day_start = date * 86400; // Start of day in seconds
            let day_end = day_start + 86400; // End of day

            // Collect all active bookings for this resource on this date
            let mut booked_slots = ArrayTrait::new();
            let booking_len = self.resource_booking_len.read(resource_id);
            let mut i: u32 = 0;

            loop {
                if i >= booking_len { break; }

                let booking_id = self.resource_booking_at.read((resource_id, i));
                let is_active = self.booking_active.read(booking_id);

                if is_active {
                    let start = self.booking_start.read(booking_id);
                    let end = self.booking_end.read(booking_id);

                    // Check if booking overlaps with the requested date
                    if start < day_end && end > day_start {
                        booked_slots.append((start, end));
                    }
                }

                i += 1;
            };

            // For simplicity, return the booked slots (caller can calculate free slots)
            // In a production system, you'd calculate actual free time slots
            booked_slots
        }

        fn create_recurring_booking(ref self: ContractState, user: ContractAddress, resource_id: u32, pattern: u8, duration: u64) {
            // Validate pattern: 0 = daily, 1 = weekly, 2 = monthly
            assert(pattern <= 2, 'Invalid pattern');
            assert(duration > 0, 'Invalid duration');

            // Verify resource exists
            let resource_count = self.resource_count.read();
            assert(resource_id < resource_count, 'Invalid resource');

            let recurring_id = self.recurring_booking_count.read();
            let timestamp = get_block_timestamp();

            let recurring_booking = RecurringBooking {
                user,
                resource_id,
                pattern,
                duration,
                start_time: timestamp,
                is_active: true,
                created_at: timestamp,
            };

            self.recurring_bookings.write(recurring_id, recurring_booking);
            self.recurring_booking_count.write(recurring_id + 1);

            // Add to user's recurring bookings
            let user_count = self.user_recurring_count.read(user);
            self.user_recurring_bookings.write((user, user_count), recurring_id);
            self.user_recurring_count.write(user, user_count + 1);

            self.emit(Event::RecurringBookingCreated(RecurringBookingCreated {
                recurring_id,
                user,
                resource_id,
                pattern,
            }));
        }

        fn get_booking_info(self: @ContractState, booking_id: u32) -> (booker: ContractAddress, resource_id: u32, start_time: u64, end_time: u64, is_active: bool) {
            let user = self.booking_booker.read(booking_id);
            let rid = self.booking_resource_id.read(booking_id);
            let s = self.booking_start.read(booking_id);
            let e = self.booking_end.read(booking_id);
            let active = self.booking_active.read(booking_id);
            (user, rid, s, e, active)
        }
    }

    // Additional helper functions for enhanced functionality
    #[generate_trait]
    impl ResourceBookingHelpers of ResourceBookingHelpersTrait {
        fn get_user_bookings(self: @ContractState, user: ContractAddress) -> Array<u32> {
            let mut user_bookings = ArrayTrait::new();
            let total_bookings = self.booking_count.read();
            let mut i: u32 = 0;

            loop {
                if i >= total_bookings { break; }

                let booker = self.booking_booker.read(i);
                if booker == user {
                    user_bookings.append(i);
                }

                i += 1;
            };

            user_bookings
        }

        fn get_recurring_booking_info(self: @ContractState, recurring_id: u32) -> RecurringBooking {
            self.recurring_bookings.read(recurring_id)
        }

        fn cancel_recurring_booking(ref self: ContractState, recurring_id: u32) {
            let caller = get_caller_address();
            let recurring = self.recurring_bookings.read(recurring_id);
            let owner = self.owner.read();

            // Only the user who created it or owner can cancel
            assert(caller == recurring.user || caller == owner, 'Not authorized');
            assert(recurring.is_active, 'Already cancelled');

            let mut updated_recurring = recurring;
            updated_recurring.is_active = false;
            self.recurring_bookings.write(recurring_id, updated_recurring);
        }
    }
}


