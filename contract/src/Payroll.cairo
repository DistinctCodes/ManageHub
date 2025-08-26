/// Payroll.cairo
/// Cairo 2 contract for managing payroll, hourly rates, and compensation

use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};

#[derive(Drop, Serde, starknet::Store)]
struct PayrollRecord {
    user_address: ContractAddress,
    period_start: u64,
    period_end: u64,
    base_pay: u256,
    bonuses: u256,
    deductions: u256,
    total_pay: u256,
    processed_at: u64,
    is_processed: bool,
}

#[derive(Drop, Serde, starknet::Store)]
struct Adjustment {
    amount: u256,
    reason: felt252,
    timestamp: u64,
    adjustment_type: u8, // 0 = deduction, 1 = bonus
}

#[starknet::contract]
mod Payroll {
    use super::{PayrollRecord, Adjustment, ContractAddress};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, Map};
    use starknet::{get_caller_address, get_block_timestamp};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        // Hourly rates: user_address -> rate (in wei or smallest unit)
        hourly_rates: Map<ContractAddress, u256>,
        // Payroll records: record_id -> PayrollRecord
        payroll_count: u32,
        payroll_records: Map<u32, PayrollRecord>,
        // User payroll history: user_address -> record_count
        user_payroll_count: Map<ContractAddress, u32>,
        // User payroll mapping: (user_address, index) -> record_id
        user_payroll_records: Map<(ContractAddress, u32), u32>,
        // Adjustments: adjustment_id -> Adjustment
        adjustment_count: u32,
        adjustments: Map<u32, Adjustment>,
        // User adjustments: (user_address, adjustment_index) -> adjustment_id
        user_adjustments: Map<(ContractAddress, u32), u32>,
        user_adjustment_count: Map<ContractAddress, u32>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        HourlyRateSet: HourlyRateSet,
        PayrollProcessed: PayrollProcessed,
        BonusAdded: BonusAdded,
        DeductionAdded: DeductionAdded,
    }

    #[derive(Drop, starknet::Event)]
    struct HourlyRateSet {
        user_address: ContractAddress,
        rate: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct PayrollProcessed {
        user_address: ContractAddress,
        record_id: u32,
        total_pay: u256,
        period_start: u64,
        period_end: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct BonusAdded {
        user_address: ContractAddress,
        amount: u256,
        reason: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct DeductionAdded {
        user_address: ContractAddress,
        amount: u256,
        reason: felt252,
    }

    fn only_owner(self: @ContractState) {
        let caller = get_caller_address();
        let stored_owner = self.owner.read();
        assert(caller == stored_owner, 'Not contract owner');
    }

    fn get_seconds_in_period(period_start: u64, period_end: u64) -> u64 {
        assert(period_end > period_start, 'Invalid period');
        period_end - period_start
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl PayrollImpl of super::super::IPayroll<ContractState> {
        fn set_hourly_rate(ref self: ContractState, user_address: ContractAddress, rate: u256) {
            self.only_owner();
            
            assert(rate > 0, 'Rate must be positive');
            
            self.hourly_rates.write(user_address, rate);
            
            self.emit(Event::HourlyRateSet(HourlyRateSet {
                user_address,
                rate,
            }));
        }

        fn calculate_pay(self: @ContractState, user_address: ContractAddress, period_start: u64, period_end: u64) -> u256 {
            let rate = self.hourly_rates.read(user_address);
            assert(rate > 0, 'No hourly rate set');
            
            // TODO: Integrate with TimeTracker to get actual hours worked
            // For now, we'll calculate based on period duration
            let seconds_worked = get_seconds_in_period(period_start, period_end);
            let hours_worked = seconds_worked / 3600; // Convert seconds to hours
            
            // Calculate base pay
            let base_pay = rate * hours_worked.into();
            
            // Calculate adjustments for the period
            let mut total_bonuses: u256 = 0;
            let mut total_deductions: u256 = 0;
            
            let adjustment_count = self.user_adjustment_count.read(user_address);
            let mut i: u32 = 0;
            
            loop {
                if i >= adjustment_count { break; }
                
                let adjustment_id = self.user_adjustments.read((user_address, i));
                let adjustment = self.adjustments.read(adjustment_id);
                
                // Check if adjustment falls within the period
                if adjustment.timestamp >= period_start && adjustment.timestamp <= period_end {
                    if adjustment.adjustment_type == 1 { // bonus
                        total_bonuses += adjustment.amount;
                    } else { // deduction
                        total_deductions += adjustment.amount;
                    }
                }
                
                i += 1;
            };
            
            // Calculate total pay
            let total_pay = base_pay + total_bonuses - total_deductions;
            total_pay
        }

        fn process_payroll(ref self: ContractState, user_address: ContractAddress, period_start: u64, period_end: u64) {
            self.only_owner();
            
            let rate = self.hourly_rates.read(user_address);
            assert(rate > 0, 'No hourly rate set');
            
            // Calculate pay components
            let total_pay = self.calculate_pay(user_address, period_start, period_end);
            
            // Create payroll record
            let record_id = self.payroll_count.read();
            let timestamp = get_block_timestamp();
            
            let record = PayrollRecord {
                user_address,
                period_start,
                period_end,
                base_pay: rate * ((period_end - period_start) / 3600).into(),
                bonuses: 0, // Will be calculated from adjustments
                deductions: 0, // Will be calculated from adjustments
                total_pay,
                processed_at: timestamp,
                is_processed: true,
            };
            
            self.payroll_records.write(record_id, record);
            self.payroll_count.write(record_id + 1);
            
            // Update user payroll history
            let user_record_count = self.user_payroll_count.read(user_address);
            self.user_payroll_records.write((user_address, user_record_count), record_id);
            self.user_payroll_count.write(user_address, user_record_count + 1);
            
            self.emit(Event::PayrollProcessed(PayrollProcessed {
                user_address,
                record_id,
                total_pay,
                period_start,
                period_end,
            }));
        }

        fn add_bonus(ref self: ContractState, user_address: ContractAddress, amount: u256, reason: felt252) {
            self.only_owner();
            
            assert(amount > 0, 'Bonus must be positive');
            
            let adjustment_id = self.adjustment_count.read();
            let timestamp = get_block_timestamp();
            
            let adjustment = Adjustment {
                amount,
                reason,
                timestamp,
                adjustment_type: 1, // bonus
            };
            
            self.adjustments.write(adjustment_id, adjustment);
            self.adjustment_count.write(adjustment_id + 1);
            
            // Add to user adjustments
            let user_adj_count = self.user_adjustment_count.read(user_address);
            self.user_adjustments.write((user_address, user_adj_count), adjustment_id);
            self.user_adjustment_count.write(user_address, user_adj_count + 1);
            
            self.emit(Event::BonusAdded(BonusAdded {
                user_address,
                amount,
                reason,
            }));
        }

        fn deduct_amount(ref self: ContractState, user_address: ContractAddress, amount: u256, reason: felt252) {
            self.only_owner();
            
            assert(amount > 0, 'Deduction must be positive');
            
            let adjustment_id = self.adjustment_count.read();
            let timestamp = get_block_timestamp();
            
            let adjustment = Adjustment {
                amount,
                reason,
                timestamp,
                adjustment_type: 0, // deduction
            };
            
            self.adjustments.write(adjustment_id, adjustment);
            self.adjustment_count.write(adjustment_id + 1);
            
            // Add to user adjustments
            let user_adj_count = self.user_adjustment_count.read(user_address);
            self.user_adjustments.write((user_address, user_adj_count), adjustment_id);
            self.user_adjustment_count.write(user_address, user_adj_count + 1);
            
            self.emit(Event::DeductionAdded(DeductionAdded {
                user_address,
                amount,
                reason,
            }));
        }
    }

    // Additional helper functions for enhanced functionality
    #[generate_trait]
    impl PayrollHelpers of PayrollHelpersTrait {
        fn get_hourly_rate(self: @ContractState, user_address: ContractAddress) -> u256 {
            self.hourly_rates.read(user_address)
        }

        fn get_payroll_record(self: @ContractState, record_id: u32) -> PayrollRecord {
            self.payroll_records.read(record_id)
        }

        fn get_user_payroll_history_count(self: @ContractState, user_address: ContractAddress) -> u32 {
            self.user_payroll_count.read(user_address)
        }

        fn get_adjustment(self: @ContractState, adjustment_id: u32) -> Adjustment {
            self.adjustments.read(adjustment_id)
        }
    }
}
