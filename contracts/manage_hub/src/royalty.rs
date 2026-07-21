// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use crate::errors::Error;
use crate::membership_token::DataKey;
use crate::types::{RoyaltyConfig, RoyaltyInfo, RoyaltyRecipient};
use soroban_sdk::{symbol_short, Address, BytesN, Env, Vec};

pub struct RoyaltyModule;

impl RoyaltyModule {
    /// Maximum allowed total royalty percentage (basis points: 10000 = 100%)
    const MAX_ROYALTY_BPS: u32 = 10000;

    /// Validates royalty configuration
    fn validate_config(recipients: &Vec<RoyaltyRecipient>) -> Result<u32, Error> {
        let mut total_percentage: u32 = 0;

        for recipient in recipients.iter() {
            total_percentage = total_percentage.saturating_add(recipient.percentage);
        }

        if total_percentage > Self::MAX_ROYALTY_BPS {
            return Err(Error::InvalidPaymentAmount);
        }

        Ok(total_percentage)
    }

    /// Sets or updates the royalty configuration for a token
    pub fn set_royalty(
        env: Env,
        token_id: BytesN<32>,
        recipients: Vec<RoyaltyRecipient>,
    ) -> Result<(), Error> {
        // Validation
        let _ = Self::validate_config(&recipients)?;

        let config = RoyaltyConfig {
            token_id: token_id.clone(),
            recipients: recipients.clone(),
            enabled: true,
        };

        // Emit set event
        env.events().publish(
            (symbol_short!("roy_set"), token_id.clone()),
            (recipients.len(), env.ledger().timestamp()),
        );

        env.storage()
            .persistent()
            .set(&DataKey::Royalty(token_id), &config);

        Ok(())
    }

    /// Calculates required royalty payments based on sale price and emits distribution events.
    pub fn calculate_and_pay_royalties(
        env: &Env,
        token_id: &BytesN<32>,
        payment_token: &Address,
        sale_price: i128,
    ) -> Result<i128, Error> {
        if sale_price <= 0 {
            return Ok(0);
        }

        let config: Option<RoyaltyConfig> = env
            .storage()
            .persistent()
            .get(&DataKey::Royalty(token_id.clone()));

        if let Some(cfg) = config {
            if !cfg.enabled || cfg.recipients.is_empty() {
                return Ok(0);
            }

            let mut total_royalty_amount: i128 = 0;

            for recipient in cfg.recipients.iter() {
                // Calculate portion using basis points (percentage * sale_price / 10000)
                let amount =
                    (sale_price * recipient.percentage as i128) / Self::MAX_ROYALTY_BPS as i128;

                if amount > 0 {
                    total_royalty_amount += amount;

                    // Note: Here we'd normally call `token::Client::new(env, payment_token).transfer(...)`
                    // To keep things simple and avoiding external cross-contract token integrations for the royalty distribution,
                    // we emit an event that off-chain indexers or wrapper contracts can use to fulfill the payment synchronously or asynchronously.
                    env.events().publish(
                        (
                            symbol_short!("roy_paid"),
                            token_id.clone(),
                            recipient.address.clone(),
                        ),
                        (payment_token.clone(), amount, env.ledger().timestamp()),
                    );
                }
            }

            return Ok(total_royalty_amount);
        }

        Ok(0)
    }

    /// Get details of royalty configuration
    pub fn get_royalty_info(env: Env, token_id: BytesN<32>) -> Option<RoyaltyInfo> {
        let config_opt: Option<RoyaltyConfig> =
            env.storage().persistent().get(&DataKey::Royalty(token_id));

        if let Some(config) = config_opt {
            let mut total_percentage = 0;
            for r in config.recipients.iter() {
                total_percentage += r.percentage;
            }

            Some(RoyaltyInfo {
                config,
                total_percentage,
            })
        } else {
            None
        }
    }
}
