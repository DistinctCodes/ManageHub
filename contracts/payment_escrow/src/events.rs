//! Escrow lifecycle events (#1873).
//!
//! Centralises event topics and payloads so escrow lifecycle actions publish a
//! consistent, indexable record.

use soroban_sdk::{symbol_short, Address, BytesN, Env, Symbol};

pub const TOPIC_CREATED: Symbol = symbol_short!("created");
pub const TOPIC_RELEASED: Symbol = symbol_short!("released");
pub const TOPIC_REFUNDED: Symbol = symbol_short!("refunded");
pub const TOPIC_PARTIAL: Symbol = symbol_short!("partial");

/// Publish a `created` event for an escrow.
pub fn emit_created(env: &Env, escrow_id: &BytesN<32>, payer: &Address, beneficiary: &Address) {
    env.events().publish(
        (TOPIC_CREATED, escrow_id.clone()),
        (payer.clone(), beneficiary.clone()),
    );
}

/// Publish a `released` event for an escrow.
pub fn emit_released(env: &Env, escrow_id: &BytesN<32>, beneficiary: &Address) {
    env.events()
        .publish((TOPIC_RELEASED, escrow_id.clone()), beneficiary.clone());
}

/// Publish a `partial_release` event for an escrow.
pub fn emit_partial_release(
    env: &Env,
    escrow_id: &BytesN<32>,
    beneficiary: &Address,
    amount: i128,
) {
    env.events().publish(
        (TOPIC_PARTIAL, escrow_id.clone()),
        (beneficiary.clone(), amount),
    );
}

/// Publish a `refunded` event for an escrow.
pub fn emit_refunded(env: &Env, escrow_id: &BytesN<32>, beneficiary: &Address) {
    env.events()
        .publish((TOPIC_REFUNDED, escrow_id.clone()), beneficiary.clone());
}
