//! Escrow lifecycle events (#1873).
//!
//! `payment_escrow::refund()` previously emitted no on-chain event, forcing
//! off-chain indexers to poll `get_status`. This module centralises the event
//! topics and payloads so create/release/refund publish a consistent,
//! indexable record.

use soroban_sdk::{symbol_short, Address, Env, Symbol};

pub const TOPIC_CREATED: Symbol = symbol_short!("created");
pub const TOPIC_RELEASED: Symbol = symbol_short!("released");
pub const TOPIC_REFUNDED: Symbol = symbol_short!("refunded");

/// Publish a `refunded` event for an escrow.
pub fn emit_refunded(env: &Env, escrow_id: u64, beneficiary: &Address) {
    env.events()
        .publish((TOPIC_REFUNDED, escrow_id), beneficiary.clone());
}

/// Publish a `released` event for an escrow.
pub fn emit_released(env: &Env, escrow_id: u64, beneficiary: &Address) {
    env.events()
        .publish((TOPIC_RELEASED, escrow_id), beneficiary.clone());
}
