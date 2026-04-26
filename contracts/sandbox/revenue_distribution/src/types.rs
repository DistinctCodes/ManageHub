use soroban_sdk::{contracttype, Address, String, Vec};

/// A registered beneficiary with a proportional share in basis points.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Beneficiary {
    pub address: Address,
    /// Share in basis points (1 bps = 0.01%). Total must equal 10_000.
    pub share_bps: u32,
}

/// A snapshot of a revenue distribution event.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Distribution {
    pub id: String,
    pub total_amount: i128,
    pub distributed_at: u64,
    pub beneficiaries: Vec<Beneficiary>,
}
