// ManageHub Smart Contract Library
// Exposes all contract interfaces and implementations

// Import all interface definitions
mod interface;
use interface::{
    IUserManager, IWorkspaceManager, ITimeTracker,
    IAccessControl, IResourceBooking, IPayroll
};

// Expose all contract modules
mod UserManager;
mod WorkspaceManager;
mod TimeTracker;
mod AccessControl;
mod ResourceBooking;
mod Payroll;

// Expose dispatchers for external contract interaction
use UserManager::IUserManagerDispatcher;
use UserManager::IUserManagerDispatcherTrait;
use WorkspaceManager::IWorkspaceManagerDispatcher;
use WorkspaceManager::IWorkspaceManagerDispatcherTrait;
use TimeTracker::ITimeTrackerDispatcher;
use TimeTracker::ITimeTrackerDispatcherTrait;
use AccessControl::IAccessControlDispatcher;
use AccessControl::IAccessControlDispatcherTrait;
use ResourceBooking::IResourceBookingDispatcher;
use ResourceBooking::IResourceBookingDispatcherTrait;
use Payroll::IPayrollDispatcher;
use Payroll::IPayrollDispatcherTrait;

// Main ManageHub contract that integrates all modules
#[starknet::contract]
mod ManageHub {
    use starknet::ContractAddress;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        is_initialized: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ContractInitialized: ContractInitialized,
    }

    #[derive(Drop, starknet::Event)]
    struct ContractInitialized {
        owner: ContractAddress,
        timestamp: u64,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.is_initialized.write(true);

        let timestamp = starknet::get_block_timestamp();
        self.emit(Event::ContractInitialized(ContractInitialized {
            owner,
            timestamp,
        }));
    }

    #[abi(embed_v0)]
    impl ManageHubImpl of super::IManageHub<ContractState> {
        fn get_owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn is_initialized(self: @ContractState) -> bool {
            self.is_initialized.read()
        }
    }
}

// Main contract interface
#[starknet::interface]
pub trait IManageHub<TContractState> {
    fn get_owner(self: @TContractState) -> ContractAddress;
    fn is_initialized(self: @TContractState) -> bool;
}
