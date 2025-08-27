# ManageHub Smart Contracts

A comprehensive suite of Cairo 2 smart contracts for managing tech hubs on StarkNet, providing user management, workspace allocation, time tracking, access control, resource booking, and payroll processing.

## 🏗️ Architecture Overview

The ManageHub smart contract suite consists of six main contract modules:

1. **UserManager** - User registration, biometric verification, and role management
2. **WorkspaceManager** - Workspace creation, allocation, and maintenance management  
3. **TimeTracker** - Clock-in/out system with biometric verification and time tracking
4. **AccessControl** - Resource access management and group-based permissions
5. **ResourceBooking** - Resource booking system with overlap prevention and recurring bookings
6. **Payroll** - Hourly rate management, pay calculation, and payroll processing

## 📋 Contract Interfaces

### IUserManager
```cairo
trait IUserManager<TContractState> {
    fn register_user(ref self: TContractState, user_address: ContractAddress, name: felt252, role: u8, biometric_hash: felt252);
    fn update_biometric(ref self: TContractState, user_address: ContractAddress, new_biometric_hash: felt252);
    fn verify_biometric(self: @TContractState, user_address: ContractAddress, biometric_hash: felt252) -> bool;
    fn get_user_role(self: @TContractState, user_address: ContractAddress) -> u8;
    fn is_user_active(self: @TContractState, user_address: ContractAddress) -> bool;
    fn deactivate_user(ref self: TContractState, user_address: ContractAddress);
}
```

**User Roles:**
- 0: None
- 1: Member  
- 2: Manager
- 3: Admin

### IWorkspaceManager
```cairo
trait IWorkspaceManager<TContractState> {
    fn create_workspace(ref self: TContractState, name: felt252, capacity: u32, workspace_type: u8);
    fn allocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn deallocate_workspace(ref self: TContractState, user_address: ContractAddress, workspace_id: u32);
    fn get_workspace_occupancy(self: @TContractState, workspace_id: u32) -> u32;
    fn is_workspace_available(self: @TContractState, workspace_id: u32) -> bool;
    fn set_workspace_maintenance(ref self: TContractState, workspace_id: u32, is_maintenance: bool);
}
```

### ITimeTracker
```cairo
trait ITimeTracker<TContractState> {
    fn clock_in(ref self: TContractState, user_address: ContractAddress, workspace_id: u32, biometric_hash: felt252);
    fn clock_out(ref self: TContractState, user_address: ContractAddress, biometric_hash: felt252);
    fn get_current_session(self: @TContractState, user_address: ContractAddress) -> (bool, u64, u32);
    fn get_daily_hours(self: @TContractState, user_address: ContractAddress, date: u64) -> u64;
    fn get_weekly_hours(self: @TContractState, user_address: ContractAddress, week_start: u64) -> u64;
}
```

### IAccessControl
```cairo
trait IAccessControl<TContractState> {
    fn grant_access(ref self: TContractState, user_address: ContractAddress, resource_id: u32, access_level: u8);
    fn revoke_access(ref self: TContractState, user_address: ContractAddress, resource_id: u32);
    fn check_access(self: @TContractState, user_address: ContractAddress, resource_id: u32) -> u8;
    fn create_access_group(ref self: TContractState, group_name: felt252, permissions: u256);
    fn add_user_to_group(ref self: TContractState, user_address: ContractAddress, group_id: u32);
}
```

**Access Levels:**
- 0: None
- 1: Read
- 2: Write  
- 3: Admin

### IResourceBooking
```cairo
trait IResourceBooking<TContractState> {
    fn book_resource(ref self: TContractState, user_address: ContractAddress, resource_id: u32, start_time: u64, end_time: u64);
    fn cancel_booking(ref self: TContractState, booking_id: u32);
    fn get_resource_availability(self: @TContractState, resource_id: u32, date: u64) -> Array<(u64, u64)>;
    fn create_recurring_booking(ref self: TContractState, user_address: ContractAddress, resource_id: u32, pattern: u8, duration: u64);
}
```

**Recurring Patterns:**
- 0: Daily
- 1: Weekly
- 2: Monthly

### IPayroll
```cairo
trait IPayroll<TContractState> {
    fn set_hourly_rate(ref self: TContractState, user_address: ContractAddress, rate: u256);
    fn calculate_pay(self: @TContractState, user_address: ContractAddress, period_start: u64, period_end: u64) -> u256;
    fn process_payroll(ref self: TContractState, user_address: ContractAddress, period_start: u64, period_end: u64);
    fn add_bonus(ref self: TContractState, user_address: ContractAddress, amount: u256, reason: felt252);
    fn deduct_amount(ref self: TContractState, user_address: ContractAddress, amount: u256, reason: felt252);
}
```

## 🚀 Key Features

### Enhanced Security
- Owner-only administrative functions
- Biometric verification for sensitive operations
- Role-based access control with hierarchical permissions
- Group-based access management with bitmap permissions

### Comprehensive Time Tracking
- Biometric-verified clock-in/out system
- Daily, weekly, and monthly hour tracking
- Session management with workspace association
- Force clock-out functionality for administrators

### Advanced Resource Management
- Overlap prevention for resource bookings
- Recurring booking patterns (daily, weekly, monthly)
- Resource availability queries
- Cancellation management with proper authorization

### Robust Payroll System
- Flexible hourly rate management
- Automatic pay calculation with time integration
- Bonus and deduction tracking with reasons
- Period-based payroll processing

### Smart Workspace Management
- Dynamic occupancy tracking
- Maintenance mode support
- Capacity management with overflow protection
- User allocation/deallocation with event logging

## 🧪 Testing

The contract suite includes comprehensive unit tests and integration tests:

```bash
# Run all tests
scarb test

# Run specific test file
snforge test test_user_manager
snforge test test_workspace_manager
snforge test test_time_tracker
snforge test test_access_control
snforge test test_resource_booking
snforge test test_payroll
snforge test test_integration
```

## 📦 Deployment

All contracts are designed to work independently or as an integrated suite. Deploy in the following order for full integration:

1. UserManager
2. WorkspaceManager  
3. AccessControl
4. ResourceBooking
5. TimeTracker
6. Payroll

## 🔧 Configuration

Each contract accepts an owner address in the constructor. The owner has administrative privileges and can delegate specific permissions to other users through the role and access control systems.

## 🎯 Usage Examples

### Complete Employee Onboarding
```cairo
// 1. Register employee
user_manager.register_user(employee_addr, 'John Doe', ROLE_MEMBER, biometric_hash);

// 2. Allocate workspace
workspace_manager.allocate_workspace(employee_addr, workspace_id);

// 3. Grant resource access
access_control.grant_access(employee_addr, resource_id, ACCESS_WRITE);

// 4. Set payroll rate
payroll.set_hourly_rate(employee_addr, hourly_rate);
```

### Daily Operations
```cairo
// Clock in
time_tracker.clock_in(employee_addr, workspace_id, biometric_hash);

// Book meeting room
resource_booking.book_resource(employee_addr, meeting_room_id, start_time, end_time);

// Clock out
time_tracker.clock_out(employee_addr, biometric_hash);

// Process payroll (end of period)
payroll.process_payroll(employee_addr, period_start, period_end);
```

## 🛡️ Security Considerations

- All administrative functions are protected by owner checks
- Biometric verification prevents unauthorized access
- Role-based permissions ensure proper authorization
- Event logging provides audit trails for all operations
- Input validation prevents invalid state transitions

## 🔄 Integration Points

The contracts are designed to work together:
- TimeTracker integrates with UserManager for biometric verification
- Payroll integrates with TimeTracker for accurate hour calculation
- AccessControl can be used with ResourceBooking for authorization
- WorkspaceManager tracks user allocations for TimeTracker context

## 📈 Gas Optimization

- Efficient storage patterns using Maps instead of LegacyMaps
- Minimal storage reads/writes in critical paths
- Batch operations where possible
- Event-driven architecture for off-chain indexing
