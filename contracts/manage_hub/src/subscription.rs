use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String};

use crate::attendance_log::AttendanceLogModule;
use crate::errors::Error;
use crate::types::{AttendanceAction, MembershipStatus, Subscription};

#[contracttype]
pub enum SubscriptionDataKey {
    Subscription(String),
    UsdcContract,
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

    pub fn create_subscription(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Require user authentication
        user.require_auth();

        // Check if subscription already exists
        let key = SubscriptionDataKey::Subscription(id.clone());
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

        // Create subscription record
        let current_time = env.ledger().timestamp();

        // Use checked addition to prevent overflow
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

        // Store and extend TTL with same key
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Emit subscription created event
        env.events().publish(
            (symbol_short!("sub_creat"), id.clone(), user.clone()),
            (payment_token.clone(), amount, current_time, expires_at)
        );

        // Log attendance event for subscription creation
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

        // Emit USDC contract set event
        env.events().publish(
            (symbol_short!("usdc_set"), usdc_address.clone()),
            (admin.clone(), env.ledger().timestamp())
        );

        Ok(())
    }

    fn get_usdc_contract_address(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&SubscriptionDataKey::UsdcContract)
            .ok_or(Error::UsdcContractNotSet)
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

        // Capture old status for event emission
        let old_status = subscription.status.clone();

        // Update status to inactive
        subscription.status = MembershipStatus::Inactive;
        env.storage().persistent().set(&key, &subscription);

        // Emit subscription cancelled event
        env.events().publish(
            (symbol_short!("sub_cancl"), id.clone(), subscription.user.clone()),
            (env.ledger().timestamp(), old_status, MembershipStatus::Inactive)
        );

        Ok(())
    }

    pub fn renew_subscription(
        env: Env,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Get existing subscription
        let key = SubscriptionDataKey::Subscription(id.clone());
        let mut subscription = Self::get_subscription(env.clone(), id.clone())?;

        // Capture old expiry for event emission
        let old_expiry = subscription.expires_at;

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

        // Emit subscription renewed event
        env.events().publish(
            (symbol_short!("sub_renew"), id.clone(), subscription.user.clone()),
            (payment_token.clone(), amount, old_expiry, subscription.expires_at)
        );

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
        details.set(String::from_str(env, "action"), action.clone());
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
