/// ResourceBooking.cairo
/// Cairo 2 contract that manages resources and bookings with overlap prevention

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

    /// Get booking info by booking_id.
    fn get_booking_info(self: @TContractState, booking_id: u32) -> (booker: starknet::ContractAddress, resource_id: u32, start_time: u64, end_time: u64, is_active: bool);
}

#[starknet::contract]
mod ResourceBooking {
    use core::asserts::assert;
    use core::bool::bool;
    use core::option::Option;
    use core::traits::TryInto;
    use core::panic_with_felt252;
    use starknet::ContractAddress;
    use starknet::storage::LegacyMap;

    #[storage]
    struct Storage {
        owner: ContractAddress,

        // Resources
        resource_count: u32,
        resources_name: LegacyMap::<u32, felt252>,
        resources_type: LegacyMap::<u32, u8>,
        resources_available: LegacyMap::<u32, bool>,

        // Bookings
        booking_count: u32,
        booking_booker: LegacyMap::<u32, ContractAddress>,
        booking_resource_id: LegacyMap::<u32, u32>,
        booking_start: LegacyMap::<u32, u64>,
        booking_end: LegacyMap::<u32, u64>,
        booking_active: LegacyMap::<u32, bool>,

        // Per-resource booking index for overlap checks
        resource_booking_len: LegacyMap::<u32, u32>,
        resource_booking_at: LegacyMap::<(u32, u32), u32>, // (resource_id, idx) -> booking_id
    }

    #[event]
    fn ResourceCreated(resource_id: u32, name: felt252, resource_type: u8);

    #[event]
    fn ResourceBooked(booking_id: u32, resource_id: u32, user: ContractAddress, start_time: u64, end_time: u64);

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

            ResourceCreated(id, name, resource_type);
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

            ResourceBooked(booking_id, resource_id, user, start_time, end_time);
            booking_id
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
}


