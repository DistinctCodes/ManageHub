use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

use crate::errors::Error;
use crate::types::{MembershipStatus, Subscription};

#[contracttype]
pub enum SubscriptionDataKey {
    Subscription(String),
    UsdcContract,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    pub fn validate_payment(
        env: Env,
        payment_token: Address,
        amount: i128,
        payer: Address,
    ) -> Result<bool, Error> {
        // Check for non-negative amount
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        // Require authorization from the payer
        payer.require_auth();

        // Get USDC token contract address from storage
        let usdc_contract = Self::get_usdc_contract_address(&env)?;

        // Validate that the payment token is USDC
        if payment_token != usdc_contract {
            return Err(Error::InvalidPaymentToken);
        }

        // Check token balance
        let token_client = token::Client::new(&env, &payment_token);
        let balance = token_client.balance(&payer);
        
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        Ok(true)
    }

    pub fn create_subscription(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // CRITICAL FIX: Require user authentication
        user.require_auth();

        // CRITICAL FIX: Check if subscription already exists
        let key = SubscriptionDataKey::Subscription(id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::SubscriptionAlreadyExists);
        }

        // Validate payment first
        Self::validate_payment(env.clone(), payment_token.clone(), amount, user.clone())?;

        // CRITICAL FIX: Actually transfer the tokens
        let token_client = token::Client::new(&env, &payment_token);
        let contract_address = env.current_contract_address();
        token_client.transfer(&user, &contract_address, &amount);

        // Create subscription record
        let current_time = env.ledger().timestamp();
        
        // CRITICAL FIX: Use checked addition to prevent overflow
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        let subscription = Subscription {
            id: id.clone(),
            user: user.clone(),
            payment_token: payment_token.clone(),
            amount,
            status: MembershipStatus::Active,
            created_at: current_time,
            expires_at,
        };

        // IMPROVEMENT: Store and extend TTL with same key (more efficient)
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        Ok(())
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Subscription(id))
            .ok_or(Error::SubscriptionNotFound)
    }

    pub fn cancel_subscription(env: Env, id: String) -> Result<(), Error> {
        let key = SubscriptionDataKey::Subscription(id.clone());
        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        // Require authorization from the subscription owner
        subscription.user.require_auth();

        // Update status to inactive
        subscription.status = MembershipStatus::Inactive;
        env.storage().persistent().set(&key, &subscription);

        Ok(())
    }

    pub fn set_usdc_contract(env: Env, admin: Address, usdc_address: Address) -> Result<(), Error> {
        admin.require_auth();

        // Check if admin is authorized (you might want to implement admin checking logic)
        // For now, we'll store the USDC contract address
        env.storage()
            .instance()
            .set(&SubscriptionDataKey::UsdcContract, &usdc_address);

        Ok(())
    }

    fn get_usdc_contract_address(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&SubscriptionDataKey::UsdcContract)
            .ok_or(Error::UsdcContractNotSet)
    }
}