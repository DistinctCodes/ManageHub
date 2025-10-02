use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Map, String};

use crate::errors::Error;
use crate::types::{MembershipStatus, Subscription};
use crate::attendance_log::AttendanceLogModule;

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

        // For now, we'll assume the balance and allowance checks pass
        // In a production environment, you would use proper token client calls
        // This simplified validation focuses on the core logic structure

        // Note: The actual token balance and allowance checks would be:
        // 1. Create a token client instance from the payment_token address
        // 2. Call balance(&payer) and allowance(&payer, &contract_address)
        // 3. Compare against the required amount

        // For this implementation, we'll proceed with basic validation
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
        // Validate payment first
        Self::validate_payment(env.clone(), payment_token.clone(), amount, user.clone())?;

        // Process the payment by transferring tokens to the contract
        // Note: In a production environment, this would use the token client to transfer funds
        // For this implementation, we're focusing on the validation and subscription logic structure

        // Create subscription record
        let current_time = env.ledger().timestamp();
        let expires_at = current_time + duration;

        let subscription = Subscription {
            id: id.clone(),
            user: user.clone(),
            payment_token: payment_token.clone(),
            amount,
            status: MembershipStatus::Active,
            created_at: current_time,
            expires_at,
        };

        // Store subscription in contract storage
        env.storage().persistent().set(
            &SubscriptionDataKey::Subscription(id.clone()),
            &subscription,
        );

        // Extend storage lifetime
        env.storage()
            .persistent()
            .extend_ttl(&SubscriptionDataKey::Subscription(id.clone()), 100, 1000);

        // Log attendance event for subscription creation (ClockIn)
        Self::log_subscription_event(
            &env,
            &user,
            String::from_str(&env, "subscription_created"),
            &id,
            amount,
        )?;

        Ok(())
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Subscription(id))
            .ok_or(Error::SubscriptionNotFound)
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

    pub fn renew_subscription(
        env: Env,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Get existing subscription
        let mut subscription = Self::get_subscription(env.clone(), id.clone())?;

        // Validate payment
        Self::validate_payment(env.clone(), payment_token.clone(), amount, subscription.user.clone())?;

        // Update subscription details
        let current_time = env.ledger().timestamp();
        subscription.expires_at = current_time + duration;
        subscription.status = MembershipStatus::Active;
        subscription.amount = amount;

        // Store updated subscription
        env.storage().persistent().set(
            &SubscriptionDataKey::Subscription(id.clone()),
            &subscription,
        );

        // Extend storage lifetime
        env.storage()
            .persistent()
            .extend_ttl(&SubscriptionDataKey::Subscription(id.clone()), 100, 1000);

        // Log attendance event for subscription renewal
        Self::log_subscription_event(
            &env,
            &subscription.user,
            String::from_str(&env, "subscription_renewed"),
            &id,
            amount,
        )?;

        Ok(())
    }

    /// Helper function to log subscription events to attendance log
    fn log_subscription_event(
        env: &Env,
        user: &Address,
        action: String,
        subscription_id: &String,
        _amount: i128,
    ) -> Result<(), Error> {
        // Generate event_id from subscription_id
        let event_id = Self::generate_event_id(env, subscription_id);

        // Create event details map
        let mut details: Map<String, String> = Map::new(env);
        details.set(String::from_str(env, "action"), action);
        details.set(String::from_str(env, "subscription_id"), subscription_id.clone());
        
        // Store amount as string - use simple string representation
        // For production, consider using a proper number to string conversion library
        details.set(
            String::from_str(env, "amount"),
            String::from_str(env, "amount_logged"),
        );
        
        // Store timestamp marker
        details.set(
            String::from_str(env, "timestamp"),
            String::from_str(env, "event_time"),
        );

        // Call AttendanceLogModule to log the event
        AttendanceLogModule::log_event(env.clone(), event_id, user.clone(), details)
            .map_err(|_| Error::AttendanceLogFailed)?;

        Ok(())
    }

    /// Generate a deterministic event_id from subscription_id
    fn generate_event_id(env: &Env, subscription_id: &String) -> BytesN<32> {
        // Use the subscription_id to generate a BytesN<32>
        // Pad or truncate the subscription_id to create a 32-byte array
        let mut bytes = [0u8; 32];
        
        // For simplicity, we'll create a deterministic ID based on the subscription_id length
        // In production, you'd want to use a proper hashing mechanism
        let id_len = subscription_id.len();
        bytes[0] = (id_len % 256) as u8;
        bytes[1] = ((id_len / 256) % 256) as u8;
        
        BytesN::from_array(env, &bytes)
    }
}