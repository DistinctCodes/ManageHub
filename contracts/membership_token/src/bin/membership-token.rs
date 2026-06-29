#![no_std]
#![no_main]

// Entry point mapping macro expanding contract capabilities for the Stellar/Soroban network
soroban_sdk::contractimpl!(membership_token::MembershipTokenContract);