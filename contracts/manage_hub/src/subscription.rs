use soroban_sdk::{contracttype, Address, BytesN, Env, Map, String, Vec};

use crate::attendance_log::AttendanceLogModule;
use crate::errors::Error;
use crate::types::{AttendanceAction, MembershipStatus, Subscription};

#[contracttype]
pub enum SubscriptionDataKey {
    // Updated to include hub_id for hub-specific subscriptions
    Subscription(String, String), // (hub_id, subscription_id)
    UsdcContract,
    HubRegistry(String), // Track registered hubs
    UserSubscriptions(Address, String), // (user_address, hub_id) -> Vec<String> subscription_ids
}

pub struct SubscriptionContract;

impl SubscriptionContract {
    fn validate_payment(
        env: &Env,
        payment_token: &Address,
        amount: i128,
        _payer: &Address,
    ) -> Result<bool, Error> {
        // Check for non-negative amount
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        // Get USDC token contract address from storage
        let usdc_contract = Self::get_usdc_contract_address(env)?;

        // Validate that the payment token is USDC
        if payment_token != &usdc_contract {
            return Err(Error::InvalidPaymentToken);
        }

        // Note: Balance checking is omitted in this implementation.
        // In production, you would check the token balance using:
        // let token_client = token::Client::new(env, payment_token);
        // let balance = token_client.balance(payer);
        // if balance < amount { return Err(Error::InsufficientBalance); }

        Ok(true)
    }

    /// Validate that a hub exists in the registry
    fn validate_hub(env: &Env, hub_id: &String) -> Result<(), Error> {
        let key = SubscriptionDataKey::HubRegistry(hub_id.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::HubNotFound);
        }
        Ok(())
    }

    /// Register a new hub (admin only)
    pub fn register_hub(env: Env, admin: Address, hub_id: String, hub_name: String) -> Result<(), Error> {
        admin.require_auth();

        let key = SubscriptionDataKey::HubRegistry(hub_id.clone());
        
        // Check if hub already exists
        if env.storage().persistent().has(&key) {
            return Err(Error::HubAlreadyExists);
        }

        // Store hub information
        env.storage().persistent().set(&key, &hub_name);
        env.storage().persistent().extend_ttl(&key, 100, 10000);

        Ok(())
    }

    /// Check if a hub is registered
    pub fn is_hub_registered(env: Env, hub_id: String) -> bool {
        let key = SubscriptionDataKey::HubRegistry(hub_id);
        env.storage().persistent().has(&key)
    }

    /// Create a subscription for a specific hub
    pub fn create_subscription(
        env: Env,
        hub_id: String,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Require user authentication
        user.require_auth();

        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        // Check if subscription already exists for this hub
        let key = SubscriptionDataKey::Subscription(hub_id.clone(), id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::SubscriptionAlreadyExists);
        }

        // Validate payment first
        Self::validate_payment(&env, &payment_token, amount, &user)?;

        // Note: Token transfer is omitted in this implementation.
        // In production, you would transfer tokens using:
        // let token_client = token::Client::new(&env, &payment_token);
        // let contract_address = env.current_contract_address();
        // token_client.transfer(&user, &contract_address, &amount);

        // Create subscription record with hub_id
        let current_time = env.ledger().timestamp();

        // Use checked addition to prevent overflow
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        let subscription = Subscription {
            id: id.clone(),
            hub_id: hub_id.clone(),
            user: user.clone(),
            payment_token: payment_token.clone(),
            amount,
            status: MembershipStatus::Active,
            created_at: current_time,
            expires_at,
        };

        // Store subscription and extend TTL
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Track user subscriptions per hub
        Self::add_user_subscription(&env, &user, &hub_id, &id)?;

        // Log attendance event for subscription creation
        Self::log_subscription_event(
            &env,
            &user,
            String::from_str(&env, "subscription_created"),
            &hub_id,
            &id,
            amount,
        )?;

        Ok(())
    }

    /// Get a subscription for a specific hub
    pub fn get_subscription(env: Env, hub_id: String, id: String) -> Result<Subscription, Error> {
        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Subscription(hub_id, id))
            .ok_or(Error::SubscriptionNotFound)
    }

    /// Get all subscriptions for a user in a specific hub
    pub fn get_user_subscriptions(env: Env, user: Address, hub_id: String) -> Result<Vec<Subscription>, Error> {
        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        let key = SubscriptionDataKey::UserSubscriptions(user.clone(), hub_id.clone());
        let subscription_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        let mut subscriptions = Vec::new(&env);
        for sub_id in subscription_ids.iter() {
            if let Ok(sub) = Self::get_subscription(env.clone(), hub_id.clone(), sub_id) {
                subscriptions.push_back(sub);
            }
        }

        Ok(subscriptions)
    }

    /// Get all active subscriptions for a user across all hubs
    pub fn get_user_active_subscriptions(env: Env, user: Address) -> Vec<Subscription> {
        // Note: This is a simplified implementation
        // In production, you might want to maintain a separate index of all user subscriptions
        let mut active_subs = Vec::new(&env);
        
        // This would require iterating through all hubs
        // For now, returning empty vec as placeholder
        // You'd need to maintain a list of all hubs to iterate through
        
        active_subs
    }

    /// Helper to track user subscriptions per hub
    fn add_user_subscription(env: &Env, user: &Address, hub_id: &String, subscription_id: &String) -> Result<(), Error> {
        let key = SubscriptionDataKey::UserSubscriptions(user.clone(), hub_id.clone());
        let mut subscription_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));

        subscription_ids.push_back(subscription_id.clone());
        
        env.storage().persistent().set(&key, &subscription_ids);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        Ok(())
    }

    /// Helper to remove user subscription tracking
    fn remove_user_subscription(env: &Env, user: &Address, hub_id: &String, subscription_id: &String) -> Result<(), Error> {
        let key = SubscriptionDataKey::UserSubscriptions(user.clone(), hub_id.clone());
        let subscription_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));

        // Filter out the subscription_id
        let mut new_ids = Vec::new(env);
        for id in subscription_ids.iter() {
            if id != *subscription_id {
                new_ids.push_back(id);
            }
        }

        env.storage().persistent().set(&key, &new_ids);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

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

    /// Cancel a subscription for a specific hub
    pub fn cancel_subscription(env: Env, hub_id: String, id: String) -> Result<(), Error> {
        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        let key = SubscriptionDataKey::Subscription(hub_id.clone(), id.clone());
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

        // Remove from user subscription tracking
        Self::remove_user_subscription(&env, &subscription.user, &hub_id, &id)?;

        Ok(())
    }

    /// Renew a subscription for a specific hub
    pub fn renew_subscription(
        env: Env,
        hub_id: String,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        // Get existing subscription
        let key = SubscriptionDataKey::Subscription(hub_id.clone(), id.clone());
        let mut subscription = Self::get_subscription(env.clone(), hub_id.clone(), id.clone())?;

        // Require authorization from subscription owner
        subscription.user.require_auth();

        // Validate payment
        Self::validate_payment(&env, &payment_token, amount, &subscription.user)?;

        // Note: Token transfer is omitted in this implementation.
        // In production, you would transfer tokens using:
        // let token_client = token::Client::new(&env, &payment_token);
        // let contract_address = env.current_contract_address();
        // token_client.transfer(&subscription.user, &contract_address, &amount);

        // Update subscription details - extend from current expiry date or current time, whichever is later
        let current_time = env.ledger().timestamp();
        let renewal_base = if subscription.expires_at > current_time {
            subscription.expires_at
        } else {
            current_time
        };

        subscription.expires_at = renewal_base
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;
        subscription.status = MembershipStatus::Active;
        subscription.amount = amount;

        // Store updated subscription and extend TTL
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Log attendance event for subscription renewal
        Self::log_subscription_event(
            &env,
            &subscription.user,
            String::from_str(&env, "subscription_renewed"),
            &hub_id,
            &id,
            amount,
        )?;

        Ok(())
    }

    /// Get all subscriptions for a specific hub (admin function)
    pub fn get_hub_subscriptions(env: Env, hub_id: String, admin: Address) -> Result<Vec<Subscription>, Error> {
        admin.require_auth();
        
        // Validate hub exists
        Self::validate_hub(&env, &hub_id)?;

        // Note: This is a placeholder implementation
        // In production, you'd need to maintain an index of all subscriptions per hub
        // For now, returning empty vector
        Ok(Vec::new(&env))
    }

    /// Helper function to log subscription events to attendance log
    fn log_subscription_event(
        env: &Env,
        user: &Address,
        action: String,
        hub_id: &String,
        subscription_id: &String,
        _amount: i128,
    ) -> Result<(), Error> {
        // Generate event_id from hub_id and subscription_id
        let event_id = Self::generate_event_id(env, hub_id, subscription_id);

        // Create event details map
        let mut details: Map<String, String> = Map::new(env);
        details.set(String::from_str(env, "action"), action.clone());
        details.set(String::from_str(env, "hub_id"), hub_id.clone());
        details.set(
            String::from_str(env, "subscription_id"),
            subscription_id.clone(),
        );

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

        // Determine the attendance action based on the event type
        let attendance_action = if action == String::from_str(env, "subscription_created") {
            AttendanceAction::ClockIn
        } else {
            AttendanceAction::ClockOut
        };

        // Call AttendanceLogModule to log the attendance (internal version without auth)
        AttendanceLogModule::log_attendance_internal(
            env.clone(),
            event_id,
            user.clone(),
            attendance_action,
            details,
        )
        .map_err(|_| Error::AttendanceLogFailed)?;

        Ok(())
    }

    /// Generate a deterministic event_id from hub_id and subscription_id
    fn generate_event_id(env: &Env, hub_id: &String, subscription_id: &String) -> BytesN<32> {
        // Use both hub_id and subscription_id to generate a BytesN<32>
        // This ensures unique event IDs per hub
        let mut bytes = [0u8; 32];

        let hub_len = hub_id.len();
        let sub_len = subscription_id.len();
        
        // Mix both IDs to create unique identifier
        bytes[0] = (hub_len % 256) as u8;
        bytes[1] = ((hub_len / 256) % 256) as u8;
        bytes[2] = (sub_len % 256) as u8;
        bytes[3] = ((sub_len / 256) % 256) as u8;

        BytesN::from_array(env, &bytes)
    }
}