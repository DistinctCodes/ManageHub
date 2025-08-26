use starknet::ContractAddress;

#[starknet::interface]
trait IUserManager<TContractState> {
    fn register_user(ref self: TContractState, user_address: ContractAddress, name: felt252, role: u8, biometric_hash: felt252);
    fn update_biometric(ref self: TContractState, user_address: ContractAddress, new_biometric_hash: felt252);
    fn verify_biometric(self: @TContractState, user_address: ContractAddress, biometric_hash: felt252) -> bool;
    fn get_user_role(self: @TContractState, user_address: ContractAddress) -> u8;
    fn is_user_active(self: @TContractState, user_address: ContractAddress) -> bool;
    fn deactivate_user(ref self: TContractState, user_address: ContractAddress);
}

#[starknet::interface]
trait IWorkspaceManager<TContractState> {
    fn create_workspace(ref self: TContractState, name: felt252, capacity: u32, workspace_type: u8);
    fn allocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn deallocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn get_workspace_occupancy(self: @TContractState, workspace_id: u32) -> u32;
    fn is_workspace_available(self: @TContractState, workspace_id: u32) -> bool;
    fn set_workspace_maintenance(ref self: TContractState, workspace_id: u32, is_maintenance: bool);
}

#[starknet::interface]
trait ITimeTracker<TContractState> {
    fn clock_in(ref self: TContractState, user_address: ContractAddress, workspace_id: u32, biometric_hash: felt252);
    fn clock_out(ref self: TContractState, user_address: ContractAddress, biometric_hash: felt252);
    fn get_current_session(self: @TContractState, user_address: ContractAddress) -> (bool, u64, u32);
    fn get_daily_hours(self: @TContractState, user_address: ContractAddress, date: u64) -> u64;
    fn get_weekly_hours(self: @TContractState, user_address: ContractAddress, week_start: u64) -> u64;
}

#[starknet::interface]
trait IAccessControl<TContractState> {
    fn grant_access(ref self: TContractState, user_address: ContractAddress, resource_id: u32, access_level: u8);
    fn revoke_access(ref self: TContractState, user_address: ContractAddress, resource_id: u32);
    fn check_access(self: @TContractState, user_address: ContractAddress, resource_id: u32) -> u8;
    fn create_access_group(ref self: TContractState, group_name: felt252, permissions: u256);
    fn add_user_to_group(ref self: TContractState, user_address: ContractAddress, group_id: u32);
}

#[starknet::interface]
trait IResourceBooking<TContractState> {
    fn book_resource(ref self: TContractState, user_address: ContractAddress, resource_id: u32, start_time: u64, end_time: u64);
    fn cancel_booking(ref self: TContractState, booking_id: u32);
    fn get_resource_availability(self: @TContractState, resource_id: u32, date: u64) -> Array<(u64, u64)>;
    fn create_recurring_booking(ref self: TContractState, user_address: ContractAddress, resource_id: u32, pattern: u8, duration: u64);
}

#[starknet::interface]
trait IPayroll<TContractState> {
    fn set_hourly_rate(ref self: TContractState, user_address: ContractAddress, rate: u256);
    fn calculate_pay(self: @TContractState, user_address: ContractAddress, period_start: u64, period_end: u64) -> u256;
    fn process_payroll(ref self: TContractState, user_address: ContractAddress, period_start: u64, period_end: u64);
    fn add_bonus(ref self: TContractState, user_address: ContractAddress, amount: u256, reason: felt252);
    fn deduct_amount(ref self: TContractState, user_address: ContractAddress, amount: u256, reason: felt252);
}
