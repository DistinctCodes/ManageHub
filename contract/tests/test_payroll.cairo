use starknet::ContractAddress;
use starknet::contract_address_const;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp};

use credenza_contract::Payroll::IPayrollDispatcher;
use credenza_contract::Payroll::IPayrollDispatcherTrait;

fn deploy_payroll() -> (ContractAddress, IPayrollDispatcher) {
    let owner = contract_address_const::<'owner'>();
    let contract = declare("Payroll").unwrap().contract_class();
    let constructor_args = array![owner.into()];
    let (contract_address, _) = contract.deploy(@constructor_args).unwrap();
    let dispatcher = IPayrollDispatcher { contract_address };
    (contract_address, dispatcher)
}

#[test]
fn test_set_hourly_rate() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let rate = 1000_u256; // 1000 wei per hour
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.set_hourly_rate(user, rate);
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_calculate_pay() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let rate = 1000_u256; // 1000 wei per hour
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.set_hourly_rate(user, rate);
    
    // Calculate pay for 8 hours (28800 seconds)
    let period_start = 0_u64;
    let period_end = 28800_u64;
    let calculated_pay = dispatcher.calculate_pay(user, period_start, period_end);
    
    // Expected: 8 hours * 1000 wei/hour = 8000 wei
    assert(calculated_pay == 8000, 'Wrong calculated pay');
    
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_process_payroll() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let rate = 1000_u256;
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    start_cheat_block_timestamp(contract_address, 1000);
    
    dispatcher.set_hourly_rate(user, rate);
    
    // Process payroll for 8 hours
    let period_start = 0_u64;
    let period_end = 28800_u64;
    dispatcher.process_payroll(user, period_start, period_end);
    
    stop_cheat_block_timestamp(contract_address);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_add_bonus() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let bonus_amount = 500_u256;
    let reason = 'Performance bonus';
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    start_cheat_block_timestamp(contract_address, 1000);
    
    dispatcher.add_bonus(user, bonus_amount, reason);
    
    stop_cheat_block_timestamp(contract_address);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_deduct_amount() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let deduction_amount = 200_u256;
    let reason = 'Late penalty';
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    start_cheat_block_timestamp(contract_address, 1000);
    
    dispatcher.deduct_amount(user, deduction_amount, reason);
    
    stop_cheat_block_timestamp(contract_address);
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_pay_calculation_with_adjustments() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let rate = 1000_u256;
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    start_cheat_block_timestamp(contract_address, 1000);
    
    dispatcher.set_hourly_rate(user, rate);
    
    // Add bonus and deduction within the period
    dispatcher.add_bonus(user, 500, 'Bonus');
    dispatcher.deduct_amount(user, 200, 'Deduction');
    
    // Calculate pay for 8 hours with adjustments
    let period_start = 500_u64; // Before adjustments
    let period_end = 29300_u64; // After adjustments (8 hours + 500 seconds)
    let calculated_pay = dispatcher.calculate_pay(user, period_start, period_end);
    
    // Expected: 8 hours * 1000 + 500 bonus - 200 deduction = 8300 wei
    assert(calculated_pay == 8300, 'Wrong pay with adjustments');
    
    stop_cheat_block_timestamp(contract_address);
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Rate must be positive',))]
fn test_invalid_hourly_rate() {
    let owner = contract_address_const::<'owner'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, owner);
    
    dispatcher.set_hourly_rate(user, 0); // Should panic
    
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: ('Not contract owner',))]
fn test_unauthorized_set_rate() {
    let owner = contract_address_const::<'owner'>();
    let unauthorized = contract_address_const::<'unauthorized'>();
    let user = contract_address_const::<'user1'>();
    let (contract_address, dispatcher) = deploy_payroll();
    
    start_cheat_caller_address(contract_address, unauthorized);
    
    dispatcher.set_hourly_rate(user, 1000); // Should panic
    
    stop_cheat_caller_address(contract_address);
}
