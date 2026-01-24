use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

use crate::attendance_log::AttendanceLogModule;
use crate::errors::Error;
use crate::membership_token::DataKey as MembershipTokenDataKey;
use crate::types::{
    AttendanceAction, MembershipStatus, PauseAction, PauseConfig, PauseHistoryEntry, PauseStats,
    Subscription,
};

#[contracttype]
pub enum SubscriptionDataKey {
    Subscription(String),
    UsdcContract,
    PauseConfig,
}

pub struct SubscriptionContract;

impl SubscriptionContract {
    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&MembershipTokenDataKey::Admin)
            .ok_or(Error::AdminNotSet)?;

        if caller != &admin {
            return Err(Error::Unauthorized);
        }

        caller.require_auth();
        Ok(())
    }

    fn get_pause_config_or_default(env: &Env) -> PauseConfig {
        env.storage()
            .instance()
            .get(&SubscriptionDataKey::PauseConfig)
            .unwrap_or(PauseConfig {
                max_pause_duration: 2_592_000,
                max_pause_count: 3,
                min_active_time: 86_400,
            })
    }

    fn validate_pause_config(config: &PauseConfig) -> Result<(), Error> {
        if config.max_pause_duration == 0 {
            return Err(Error::InvalidPauseConfig);
        }
        if config.max_pause_count == 0 {
            return Err(Error::InvalidPauseConfig);
        }
        Ok(())
    }

    pub fn set_pause_config(env: Env, admin: Address, config: PauseConfig) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;
        Self::validate_pause_config(&config)?;
        env.storage()
            .instance()
            .set(&SubscriptionDataKey::PauseConfig, &config);
        Ok(())
    }

    pub fn get_pause_config(env: Env) -> PauseConfig {
        Self::get_pause_config_or_default(&env)
    }

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
            paused_at: None,
            last_resumed_at: current_time,
            pause_count: 0,
            total_paused_duration: 0,
            pause_history: Vec::new(&env),
        };

        // Store and extend TTL with same key
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

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

    pub fn pause_subscription(
        env: Env,
        id: String,
        reason: Option<String>,
    ) -> Result<(), Error> {
        let key = SubscriptionDataKey::Subscription(id.clone());
        let subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        subscription.user.require_auth();
        let actor = subscription.user.clone();
        Self::pause_subscription_internal(env, id, subscription, actor, false, reason)
    }

    pub fn pause_subscription_admin(
        env: Env,
        id: String,
        admin: Address,
        reason: Option<String>,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;

        let key = SubscriptionDataKey::Subscription(id.clone());
        let subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        Self::pause_subscription_internal(env, id, subscription, admin, true, reason)
    }

    fn pause_subscription_internal(
        env: Env,
        id: String,
        mut subscription: Subscription,
        actor: Address,
        is_admin: bool,
        reason: Option<String>,
    ) -> Result<(), Error> {
        let current_time = env.ledger().timestamp();

        if subscription.status == MembershipStatus::Paused {
            return Err(Error::SubscriptionPaused);
        }
        if subscription.status != MembershipStatus::Active {
            return Err(Error::SubscriptionNotActive);
        }
        if current_time >= subscription.expires_at {
            return Err(Error::SubscriptionNotActive);
        }

        let config = Self::get_pause_config_or_default(&env);
        if !is_admin {
            if subscription.pause_count >= config.max_pause_count {
                return Err(Error::PauseCountExceeded);
            }

            let since_last_resume = current_time
                .checked_sub(subscription.last_resumed_at)
                .unwrap_or(0);
            if since_last_resume < config.min_active_time {
                return Err(Error::PauseTooEarly);
            }
        }

        subscription.status = MembershipStatus::Paused;
        subscription.paused_at = Some(current_time);
        subscription.pause_count = subscription.pause_count.saturating_add(1);

        let entry = PauseHistoryEntry {
            action: PauseAction::Pause,
            timestamp: current_time,
            actor: actor.clone(),
            is_admin,
            reason: reason.clone(),
            paused_duration: None,
            applied_extension: None,
        };
        subscription.pause_history.push_back(entry.clone());

        let key = SubscriptionDataKey::Subscription(id.clone());
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        env.events()
            .publish((symbol_short!("subscr"), id.clone(), subscription.user.clone()), entry);

        Self::log_subscription_event(
            &env,
            &subscription.user,
            String::from_str(&env, "subscription_paused"),
            &id,
            subscription.amount,
        )?;

        Ok(())
    }

    pub fn resume_subscription(env: Env, id: String) -> Result<(), Error> {
        let key = SubscriptionDataKey::Subscription(id.clone());
        let subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        subscription.user.require_auth();
        let actor = subscription.user.clone();
        Self::resume_subscription_internal(env, id, subscription, actor, false)
    }

    pub fn resume_subscription_admin(env: Env, id: String, admin: Address) -> Result<(), Error> {
        Self::require_admin(&env, &admin)?;

        let key = SubscriptionDataKey::Subscription(id.clone());
        let subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        Self::resume_subscription_internal(env, id, subscription, admin, true)
    }

    fn resume_subscription_internal(
        env: Env,
        id: String,
        mut subscription: Subscription,
        actor: Address,
        is_admin: bool,
    ) -> Result<(), Error> {
        if subscription.status != MembershipStatus::Paused {
            return Err(Error::SubscriptionNotPaused);
        }

        let paused_at = subscription.paused_at.ok_or(Error::SubscriptionNotPaused)?;
        let current_time = env.ledger().timestamp();
        let paused_duration = current_time
            .checked_sub(paused_at)
            .ok_or(Error::TimestampOverflow)?;

        let config = Self::get_pause_config_or_default(&env);
        let applied_extension = if is_admin {
            paused_duration
        } else if paused_duration > config.max_pause_duration {
            config.max_pause_duration
        } else {
            paused_duration
        };

        subscription.expires_at = subscription
            .expires_at
            .checked_add(applied_extension)
            .ok_or(Error::TimestampOverflow)?;
        subscription.status = MembershipStatus::Active;
        subscription.paused_at = None;
        subscription.last_resumed_at = current_time;
        subscription.total_paused_duration = subscription
            .total_paused_duration
            .checked_add(paused_duration)
            .ok_or(Error::TimestampOverflow)?;

        let entry = PauseHistoryEntry {
            action: PauseAction::Resume,
            timestamp: current_time,
            actor: actor.clone(),
            is_admin,
            reason: None,
            paused_duration: Some(paused_duration),
            applied_extension: Some(applied_extension),
        };
        subscription.pause_history.push_back(entry.clone());

        let key = SubscriptionDataKey::Subscription(id.clone());
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        env.events().publish(
            (symbol_short!("subscr"), id.clone(), subscription.user.clone()),
            entry,
        );

        Self::log_subscription_event(
            &env,
            &subscription.user,
            String::from_str(&env, "subscription_resumed"),
            &id,
            subscription.amount,
        )?;

        Ok(())
    }

    pub fn get_pause_history(env: Env, id: String) -> Result<Vec<PauseHistoryEntry>, Error> {
        let subscription = Self::get_subscription(env, id)?;
        Ok(subscription.pause_history)
    }

    pub fn get_pause_stats(env: Env, id: String) -> Result<PauseStats, Error> {
        let subscription = Self::get_subscription(env, id)?;
        Ok(PauseStats {
            pause_count: subscription.pause_count,
            total_paused_duration: subscription.total_paused_duration,
            is_paused: subscription.status == MembershipStatus::Paused,
            paused_at: subscription.paused_at,
        })
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
        subscription.paused_at = None;
        env.storage().persistent().set(&key, &subscription);

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

        // Require authorization from subscription owner
        subscription.user.require_auth();

        if subscription.status == MembershipStatus::Paused {
            return Err(Error::SubscriptionPaused);
        }

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
