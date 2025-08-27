/// TimeTracker.cairo
/// Cairo 2 contract for tracking user time with biometric verification

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

#[derive(Drop, Serde, starknet::Store)]
struct TimeSession {
    user_address: ContractAddress,
    workspace_id: u32,
    clock_in_time: u64,
    clock_out_time: u64,
    is_active: bool,
}

#[derive(Drop, Serde, starknet::Store)]
struct DailyHours {
    date: u64,
    total_hours: u64,
}

#[starknet::contract]
mod TimeTracker {
    use super::{TimeSession, DailyHours, ContractAddress};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        // Current active sessions
        current_sessions: Map<ContractAddress, TimeSession>,
        // Daily hours tracking: user_address -> date -> hours
        daily_hours: Map<(ContractAddress, u64), u64>,
        // Weekly hours tracking: user_address -> week_start -> hours  
        weekly_hours: Map<(ContractAddress, u64), u64>,
        // Session history counter
        session_count: u32,
        // Session history: session_id -> TimeSession
        session_history: Map<u32, TimeSession>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ClockedIn: ClockedIn,
        ClockedOut: ClockedOut,
        BiometricVerificationFailed: BiometricVerificationFailed,
    }

    #[derive(Drop, starknet::Event)]
    struct ClockedIn {
        user_address: ContractAddress,
        workspace_id: u32,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct ClockedOut {
        user_address: ContractAddress,
        workspace_id: u32,
        timestamp: u64,
        duration: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BiometricVerificationFailed {
        user_address: ContractAddress,
        timestamp: u64,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    fn get_date_from_timestamp(timestamp: u64) -> u64 {
        // Convert timestamp to date (simplified - assumes timestamp is in seconds)
        // Returns day number since epoch
        timestamp / 86400 // 24 * 60 * 60 seconds per day
    }

    fn get_week_start_from_timestamp(timestamp: u64) -> u64 {
        // Get the start of the week (Monday) for a given timestamp
        let day = get_date_from_timestamp(timestamp);
        let day_of_week = day % 7; // 0 = Monday, 6 = Sunday
        day - day_of_week
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl TimeTrackerImpl of super::super::interface::ITimeTracker<ContractState> {
        fn clock_in(ref self: ContractState, user_address: ContractAddress, workspace_id: u32, biometric_hash: felt252) {
            let timestamp = get_block_timestamp();
            
            // Check if user already has an active session
            let current_session = self.current_sessions.read(user_address);
            assert(!current_session.is_active, 'User already clocked in');
            
            // TODO: Verify biometric hash against UserManager contract
            // For now, we'll assume verification is handled externally
            
            let session = TimeSession {
                user_address,
                workspace_id,
                clock_in_time: timestamp,
                clock_out_time: 0,
                is_active: true,
            };
            
            self.current_sessions.write(user_address, session);
            
            self.emit(Event::ClockedIn(ClockedIn {
                user_address,
                workspace_id,
                timestamp,
            }));
        }

        fn clock_out(ref self: ContractState, user_address: ContractAddress, biometric_hash: felt252) {
            let timestamp = get_block_timestamp();
            
            let mut session = self.current_sessions.read(user_address);
            assert(session.is_active, 'No active session');
            
            // TODO: Verify biometric hash against UserManager contract
            
            let duration = timestamp - session.clock_in_time;
            session.clock_out_time = timestamp;
            session.is_active = false;
            
            // Update current session
            self.current_sessions.write(user_address, session);
            
            // Store in session history
            let session_id = self.session_count.read();
            self.session_history.write(session_id, session);
            self.session_count.write(session_id + 1);
            
            // Update daily hours
            let date = get_date_from_timestamp(timestamp);
            let current_daily = self.daily_hours.read((user_address, date));
            self.daily_hours.write((user_address, date), current_daily + duration);
            
            // Update weekly hours
            let week_start = get_week_start_from_timestamp(timestamp);
            let current_weekly = self.weekly_hours.read((user_address, week_start));
            self.weekly_hours.write((user_address, week_start), current_weekly + duration);
            
            self.emit(Event::ClockedOut(ClockedOut {
                user_address,
                workspace_id: session.workspace_id,
                timestamp,
                duration,
            }));
        }

        fn get_current_session(self: @ContractState, user_address: ContractAddress) -> (bool, u64, u32) {
            let session = self.current_sessions.read(user_address);
            (session.is_active, session.clock_in_time, session.workspace_id)
        }

        fn get_daily_hours(self: @ContractState, user_address: ContractAddress, date: u64) -> u64 {
            self.daily_hours.read((user_address, date))
        }

        fn get_weekly_hours(self: @ContractState, user_address: ContractAddress, week_start: u64) -> u64 {
            self.weekly_hours.read((user_address, week_start))
        }
    }

    // Additional helper functions for enhanced functionality
    #[generate_trait]
    impl TimeTrackerHelpers of TimeTrackerHelpersTrait {
        fn force_clock_out(ref self: ContractState, user_address: ContractAddress) {
            self.only_owner();
            
            let mut session = self.current_sessions.read(user_address);
            if session.is_active {
                let timestamp = get_block_timestamp();
                let duration = timestamp - session.clock_in_time;
                
                session.clock_out_time = timestamp;
                session.is_active = false;
                self.current_sessions.write(user_address, session);
                
                // Update daily and weekly hours
                let date = get_date_from_timestamp(timestamp);
                let current_daily = self.daily_hours.read((user_address, date));
                self.daily_hours.write((user_address, date), current_daily + duration);
                
                let week_start = get_week_start_from_timestamp(timestamp);
                let current_weekly = self.weekly_hours.read((user_address, week_start));
                self.weekly_hours.write((user_address, week_start), current_weekly + duration);
            }
        }

        fn get_session_duration(self: @ContractState, user_address: ContractAddress) -> u64 {
            let session = self.current_sessions.read(user_address);
            if session.is_active {
                let current_time = get_block_timestamp();
                current_time - session.clock_in_time
            } else {
                0
            }
        }

        fn get_monthly_hours(self: @ContractState, user_address: ContractAddress, month_start: u64) -> u64 {
            // Simplified monthly calculation - sum weekly hours for the month
            let mut total: u64 = 0;
            let mut week_start = month_start;
            let month_end = month_start + (30 * 86400); // Approximate 30 days
            
            // This is a simplified approach - in production, you'd want more efficient storage
            loop {
                if week_start >= month_end { break; }
                let weekly = self.weekly_hours.read((user_address, week_start));
                total += weekly;
                week_start += (7 * 86400); // 7 days
            };
            
            total
        }
    }
}
