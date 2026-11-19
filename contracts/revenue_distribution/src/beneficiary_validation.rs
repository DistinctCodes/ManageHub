//! Validation helpers for `revenue_distribution` (#1883, #1884).
//!
//! `revenue_distribution` currently accepts duplicate beneficiaries and
//! zero/negative allocations. These helpers give the configure path a single
//! place to reject such inputs.

use crate::Recipient;
use soroban_sdk::Vec;

/// Returns `true` when every basis-point allocation is strictly positive (#1884).
pub fn all_positive(basis_points: &Vec<u32>) -> bool {
    for i in 0..basis_points.len() {
        if basis_points.get(i).unwrap() == 0 {
            return false;
        }
    }
    true
}

/// Returns `true` when the same address is listed more than once (#1883).
pub fn has_duplicate_addresses(recipients: &Vec<Recipient>) -> bool {
    for i in 0..recipients.len() {
        for j in (i + 1)..recipients.len() {
            if recipients.get(i).unwrap().address == recipients.get(j).unwrap().address {
                return true;
            }
        }
    }
    false
}

/// Returns `true` when the allocations sum to exactly 10 000 basis points.
pub fn sums_to_full_split(basis_points: &Vec<u32>) -> bool {
    let mut total: u32 = 0;
    for i in 0..basis_points.len() {
        total += basis_points.get(i).unwrap();
    }
    total == 10_000
}
