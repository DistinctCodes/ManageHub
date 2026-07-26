use soroban_sdk::{contracttype, Address, BytesN, Map, String, Vec};

/// Membership status for tokens and subscriptions.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MembershipStatus {
    Active,
    Expired,
    Inactive,
    Paused,
    GracePeriod,
}

/// Token metadata with versioning support.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenMetadata {
    pub description: String,
    pub attributes: Map<String, MetadataValue>,
    pub version: u32,
    pub last_updated: u64,
    pub updated_by: Address,
}

/// Metadata value type for indexed attributes.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum MetadataValue {
    Text(String),
    Number(i64),
    Boolean(bool),
}

/// Record of a metadata update.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MetadataUpdate {
    pub version: u32,
    pub timestamp: u64,
    pub updated_by: Address,
    pub description: String,
    pub changes: Map<String, MetadataValue>,
}

/// Configuration for token renewal system.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RenewalConfig {
    pub grace_period_duration: u64,
    pub auto_renewal_notice_days: u64,
    pub renewals_enabled: bool,
}

/// Record of a renewal attempt.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RenewalHistory {
    pub timestamp: u64,
    pub tier_id: String,
    pub amount: i128,
    pub payment_token: Address,
    pub success: bool,
    pub trigger: RenewalTrigger,
    pub old_expiry_date: u64,
    pub new_expiry_date: Option<u64>,
    pub error: Option<String>,
}

/// Trigger reason for renewal.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum RenewalTrigger {
    Manual,
    AutoRenewal,
    GracePeriod,
}

/// Auto-renewal settings.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct AutoRenewalSettings {
    pub enabled: bool,
    pub token_id: BytesN<32>,
    pub payment_token: Address,
    pub updated_at: u64,
}

/// Global emergency pause state.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct EmergencyPauseState {
    pub is_paused: bool,
    pub paused_at: Option<u64>,
    pub paused_by: Option<Address>,
    pub reason: Option<String>,
    pub auto_unpause_at: Option<u64>,
    pub time_lock_until: Option<u64>,
    pub pause_count: u32,
}

/// Per-token pause state.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenPauseState {
    pub is_paused: bool,
    pub paused_at: u64,
    pub paused_by: Address,
    pub reason: Option<String>,
}

/// Token allowance for delegated transfers.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenAllowance {
    pub token_id: BytesN<32>,
    pub owner: Address,
    pub spender: Address,
    pub amount: i128,
    pub expires_at: Option<u64>,
    pub updated_at: u64,
}

/// Royalty recipient configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RoyaltyRecipient {
    pub address: Address,
    pub percentage: u32,
}

/// Royalty configuration for a token.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RoyaltyConfig {
    pub token_id: BytesN<32>,
    pub recipients: Vec<RoyaltyRecipient>,
    pub enabled: bool,
}

/// Information about token royalties.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RoyaltyInfo {
    pub config: RoyaltyConfig,
    pub total_percentage: u32,
}

/// Fractional token info.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct FractionalTokenInfo {
    pub token_id: BytesN<32>,
    pub total_shares: i128,
    pub min_fraction_size: i128,
    pub created_at: u64,
    pub created_by: Address,
}

/// Holder of fractional shares.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct FractionHolder {
    pub holder: Address,
    pub shares: i128,
    pub voting_power_bps: u32,
}

/// Dividend distribution result.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct DividendDistribution {
    pub token_id: BytesN<32>,
    pub total_amount: i128,
    pub recipients: u32,
    pub distributed_at: u64,
}

/// Upgrade configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UpgradeConfig {
    pub upgrades_enabled: bool,
    pub admin_only: bool,
    pub max_rollbacks: u32,
}

/// Snapshot of token state for rollback.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct TokenVersionSnapshot {
    pub version: u32,
    pub expiry_date: u64,
    pub status: MembershipStatus,
    pub tier_id: Option<String>,
    pub captured_at: u64,
    pub label: Option<String>,
}

/// Record of a token upgrade.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct UpgradeRecord {
    pub token_id: BytesN<32>,
    pub from_version: u32,
    pub to_version: u32,
    pub upgraded_by: Address,
    pub upgraded_at: u64,
    pub label: Option<String>,
    pub is_rollback: bool,
}

/// Result for a single token in a batch upgrade.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct BatchUpgradeResult {
    pub token_id: BytesN<32>,
    pub success: bool,
    pub new_version: Option<u32>,
}

/// Staking tier configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingTier {
    pub id: String,
    pub name: String,
    pub min_stake_amount: i128,
    pub lock_duration: u64,
    pub reward_multiplier_bps: u32,
    pub base_rate_bps: u32,
}

/// Active stake information.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakeInfo {
    pub staker: Address,
    pub amount: i128,
    pub tier_id: String,
    pub staked_at: u64,
    pub unlock_at: u64,
    pub claimed_rewards: i128,
    pub emergency_unstaked: bool,
}

/// Global staking configuration.
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct StakingConfig {
    pub staking_enabled: bool,
    pub emergency_unstake_penalty_bps: u32,
    pub staking_token: Address,
    pub reward_pool: Address,
}

/// Validates token metadata against size and format constraints.
pub fn validate_metadata(metadata: &TokenMetadata) -> Result<(), &'static str> {
    if metadata.description.len() > 500 {
        return Err("description too long");
    }
    if metadata.attributes.len() > 20 {
        return Err("too many attributes");
    }
    for key in metadata.attributes.keys() {
        if key.len() > 64 {
            return Err("attribute key too long");
        }
        if let Some(val) = metadata.attributes.get(key.clone()) {
            if let MetadataValue::Text(ref t) = val {
                if t.len() > 500 {
                    return Err("text value too long");
                }
            }
        }
    }
    Ok(())
}

/// Validates a single metadata attribute.
pub fn validate_attribute(key: &String, value: &MetadataValue) -> Result<(), &'static str> {
    if key.len() > 64 {
        return Err("attribute key too long");
    }
    if let MetadataValue::Text(ref t) = value {
        if t.len() > 500 {
            return Err("text value too long");
        }
    }
    Ok(())
}
