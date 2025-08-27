use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use credenza_contract::ResourceBooking::IResourceBookingDispatcher;
use credenza_contract::ResourceBooking::IResourceBookingDispatcherTrait;

fn deploy_resource_booking() -> (ContractAddress, IResourceBookingDispatcher) {
    let contract = declare("ResourceBooking").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@ArrayTrait::new()).unwrap();
    let dispatcher = IResourceBookingDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_create_resource() {
    let owner = contract_address_const::<'owner'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    assert(resource_id == 0, 'Wrong resource ID');
    
    let (name, resource_type, is_available) = dispatcher.get_resource_info(resource_id);
    assert(name == 'Meeting Room A', 'Wrong name');
    assert(resource_type == 1, 'Wrong type');
    assert(is_available, 'Should be available');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_book_resource() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource first
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    
    // Book resource
    let start_time = 1000_u64;
    let end_time = 2000_u64;
    let booking_id = dispatcher.book_resource(user, resource_id, start_time, end_time);
    
    // Verify booking
    let (booker, rid, start, end, is_active) = dispatcher.get_booking_info(booking_id);
    assert(booker == user, 'Wrong booker');
    assert(rid == resource_id, 'Wrong resource');
    assert(start == start_time, 'Wrong start time');
    assert(end == end_time, 'Wrong end time');
    assert(is_active, 'Booking should be active');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_cancel_booking() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource and booking
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    let booking_id = dispatcher.book_resource(user, resource_id, 1000, 2000);
    
    // Cancel booking
    dispatcher.cancel_booking(booking_id);
    
    // Verify booking is cancelled
    let (_, _, _, _, is_active) = dispatcher.get_booking_info(booking_id);
    assert(!is_active, 'Booking should be cancelled');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Resource not available',))]
fn test_overlapping_booking() {
    let owner = contract_address_const::<'owner'>();
    let user1 = contract_address_const::<'user1'>();
    let user2 = contract_address_const::<'user2'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    
    // First booking
    dispatcher.book_resource(user1, resource_id, 1000, 2000);
    
    // Overlapping booking should fail
    dispatcher.book_resource(user2, resource_id, 1500, 2500); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_create_recurring_booking() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource first
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    
    // Create weekly recurring booking (pattern = 1, duration = 1 hour)
    dispatcher.create_recurring_booking(user, resource_id, 1, 3600);
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_get_resource_availability() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    
    // Book resource for part of the day
    dispatcher.book_resource(user, resource_id, 86400 + 3600, 86400 + 7200); // 1-2 PM on day 1
    
    // Get availability for day 1
    let availability = dispatcher.get_resource_availability(resource_id, 1);
    assert(availability.len() == 1, 'Should have one booking');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Not authorized',))]
fn test_unauthorized_cancel_booking() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let unauthorized = contract_address_const::<'unauthorized'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource and booking
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    let booking_id = dispatcher.book_resource(user, resource_id, 1000, 2000);
    
    stop_cheat_caller_address(contract_address);
    start_cheat_caller_address(contract_address, unauthorized);
    
    // Unauthorized user tries to cancel
    dispatcher.cancel_booking(booking_id); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Invalid time',))]
fn test_invalid_booking_time() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_resource_booking();
    
    start_cheat_caller_address(contract_address, owner);
    
    // Create resource
    let resource_id = dispatcher.create_resource('Meeting Room A', 1);
    
    // Try to book with end time before start time
    dispatcher.book_resource(user, resource_id, 2000, 1000); // Should panic
    
    stop_cheat_caller_address(contract_address);
}
