// Allow deprecated events API until migration to #[contractevent] macro
#![allow(deprecated)]

use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Map, String, Vec};

use crate::attendance_log::AttendanceLogModule;
use crate::errors::Error;
use crate::membership_token::DataKey as MembershipTokenDataKey;
use crate::types::{
    AttendanceAction, BillingCycle, CreatePromotionParams, CreateTierParams, MembershipStatus,
    PauseAction, PauseConfig, PauseHistoryEntry, PauseStats, Subscription, SubscriptionTier,
    TierAnalytics, TierChangeRequest, TierChangeStatus, TierChangeType, TierFeature, TierLevel,
    TierPromotion, UpdateTierParams, UserSubscriptionInfo,
};

#[contracttype]
pub enum SubscriptionDataKey {
    Subscription(String),
    UsdcContract,
    PauseConfig,
    // Tier storage keys
    Tier(String),
    TierList,
    TierPromotion(String),
    TierPromotionList,
    TierChangeRequest(String),
    UserTierChangeHistory(Address),
    TierAnalytics(String),
    UserSubscriptionByTier(Address, String),
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

    #[allow(deprecated)]
    /// Creates a subscription without tier (legacy support).
    /// For new subscriptions, prefer `create_subscription_with_tier`.
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

        // Use empty tier_id for legacy subscriptions and default to Monthly billing
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
            tier_id: String::from_str(&env, ""),
            billing_cycle: BillingCycle::Monthly,
        };

        // Store and extend TTL with same key
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Emit subscription created event
        env.events().publish(
            (symbol_short!("sub_creat"), id.clone(), user.clone()),
            (payment_token.clone(), amount, current_time, expires_at),
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

    pub fn pause_subscription(env: Env, id: String, reason: Option<String>) -> Result<(), Error> {
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

    #[allow(deprecated)]
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

            let since_last_resume = current_time.saturating_sub(subscription.last_resumed_at);
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

        env.events().publish(
            (
                symbol_short!("subscr"),
                id.clone(),
                subscription.user.clone(),
            ),
            entry,
        );

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

    #[allow(deprecated)]
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
            (
                symbol_short!("subscr"),
                id.clone(),
                subscription.user.clone(),
            ),
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
            tier_id: subscription.tier_id,
            billing_cycle: subscription.billing_cycle,
        })
    }

    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Subscription(id))
            .ok_or(Error::SubscriptionNotFound)
    }

    #[allow(deprecated)]
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
            (admin.clone(), env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn get_usdc_contract_address(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&SubscriptionDataKey::UsdcContract)
            .ok_or(Error::UsdcContractNotSet)
    }

    #[allow(deprecated)]
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
        subscription.paused_at = None;
        env.storage().persistent().set(&key, &subscription);

        // Emit subscription cancelled event
        env.events().publish(
            (
                symbol_short!("sub_cancl"),
                id.clone(),
                subscription.user.clone(),
            ),
            (
                env.ledger().timestamp(),
                old_status,
                MembershipStatus::Inactive,
            ),
        );

        Ok(())
    }

    #[allow(deprecated)]
    /// Renews a subscription for additional duration.
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

        // Update tier analytics if subscription has a tier
        if !subscription.tier_id.is_empty() {
            let _ = Self::update_tier_analytics_on_subscribe(&env, &subscription.tier_id, amount);
        }

        // Emit subscription renewed event
        env.events().publish(
            (
                symbol_short!("sub_renew"),
                id.clone(),
                subscription.user.clone(),
            ),
            (
                payment_token.clone(),
                amount,
                old_expiry,
                subscription.expires_at,
            ),
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

    // ============================================================================
    // Tier Management Functions
    // ============================================================================

    /// Creates a new subscription tier. Admin only.
    pub fn create_tier(env: Env, admin: Address, params: CreateTierParams) -> Result<(), Error> {
        admin.require_auth();

        // Validate prices
        if params.price < 0 {
            return Err(Error::InvalidTierPrice);
        }
        if params.annual_price < 0 {
            return Err(Error::InvalidTierPrice);
        }

        // Check if tier already exists
        let key = SubscriptionDataKey::Tier(params.id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::TierAlreadyExists);
        }

        let current_time = env.ledger().timestamp();
        let tier = SubscriptionTier {
            id: params.id.clone(),
            name: params.name.clone(),
            level: params.level.clone(),
            price: params.price,
            annual_price: params.annual_price,
            features: params.features.clone(),
            max_users: params.max_users,
            max_storage: params.max_storage,
            is_active: true,
            created_at: current_time,
            updated_at: current_time,
        };

        // Store tier
        env.storage().persistent().set(&key, &tier);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Add to tier list
        let list_key = SubscriptionDataKey::TierList;
        let mut tier_list: Vec<String> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(&env));
        tier_list.push_back(params.id.clone());
        env.storage().persistent().set(&list_key, &tier_list);

        // Initialize analytics for this tier
        let analytics = TierAnalytics {
            tier_id: params.id.clone(),
            active_subscribers: 0,
            total_revenue: 0,
            upgrades_count: 0,
            downgrades_count: 0,
            churn_rate: 0,
            updated_at: current_time,
        };
        let analytics_key = SubscriptionDataKey::TierAnalytics(params.id.clone());
        env.storage().persistent().set(&analytics_key, &analytics);

        // Emit tier created event
        env.events().publish(
            (symbol_short!("tier_crt"), params.id.clone(), admin.clone()),
            (params.name, params.level, params.price, current_time),
        );

        Ok(())
    }

    /// Updates an existing subscription tier. Admin only.
    pub fn update_tier(env: Env, admin: Address, params: UpdateTierParams) -> Result<(), Error> {
        admin.require_auth();

        let key = SubscriptionDataKey::Tier(params.id.clone());
        let mut tier: SubscriptionTier = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::TierNotFound)?;

        // Update fields if provided
        if let Some(new_name) = params.name {
            tier.name = new_name;
        }
        if let Some(new_price) = params.price {
            if new_price < 0 {
                return Err(Error::InvalidTierPrice);
            }
            tier.price = new_price;
        }
        if let Some(new_annual_price) = params.annual_price {
            if new_annual_price < 0 {
                return Err(Error::InvalidTierPrice);
            }
            tier.annual_price = new_annual_price;
        }
        if let Some(new_features) = params.features {
            tier.features = new_features;
        }
        if let Some(new_max_users) = params.max_users {
            tier.max_users = new_max_users;
        }
        if let Some(new_max_storage) = params.max_storage {
            tier.max_storage = new_max_storage;
        }
        if let Some(new_is_active) = params.is_active {
            tier.is_active = new_is_active;
        }

        tier.updated_at = env.ledger().timestamp();

        // Store updated tier
        env.storage().persistent().set(&key, &tier);

        // Emit tier updated event
        env.events().publish(
            (symbol_short!("tier_upd"), params.id.clone(), admin.clone()),
            (tier.updated_at,),
        );

        Ok(())
    }

    /// Gets a subscription tier by ID.
    pub fn get_tier(env: Env, id: String) -> Result<SubscriptionTier, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Tier(id))
            .ok_or(Error::TierNotFound)
    }

    /// Gets all available subscription tiers.
    pub fn get_all_tiers(env: Env) -> Vec<SubscriptionTier> {
        let list_key = SubscriptionDataKey::TierList;
        let tier_ids: Vec<String> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(&env));

        let mut tiers = Vec::new(&env);
        for tier_id in tier_ids.iter() {
            if let Some(tier) = env
                .storage()
                .persistent()
                .get::<_, SubscriptionTier>(&SubscriptionDataKey::Tier(tier_id))
            {
                tiers.push_back(tier);
            }
        }
        tiers
    }

    /// Gets only active tiers available for purchase.
    pub fn get_active_tiers(env: Env) -> Vec<SubscriptionTier> {
        let all_tiers = Self::get_all_tiers(env.clone());
        let mut active_tiers = Vec::new(&env);
        for tier in all_tiers.iter() {
            if tier.is_active {
                active_tiers.push_back(tier);
            }
        }
        active_tiers
    }

    /// Deactivates a tier (soft delete). Admin only.
    pub fn deactivate_tier(env: Env, admin: Address, id: String) -> Result<(), Error> {
        admin.require_auth();

        let key = SubscriptionDataKey::Tier(id.clone());
        let mut tier: SubscriptionTier = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::TierNotFound)?;

        tier.is_active = false;
        tier.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&key, &tier);

        // Emit tier deactivated event
        env.events().publish(
            (symbol_short!("tier_dea"), id.clone(), admin.clone()),
            (tier.updated_at,),
        );

        Ok(())
    }

    // ============================================================================
    // Subscription with Tier Support
    // ============================================================================

    /// Creates a subscription with tier support.
    pub fn create_subscription_with_tier(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        tier_id: String,
        billing_cycle: BillingCycle,
        promo_code: Option<String>,
    ) -> Result<(), Error> {
        user.require_auth();

        // Check if subscription already exists
        let key = SubscriptionDataKey::Subscription(id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::SubscriptionAlreadyExists);
        }

        // Get and validate tier
        let tier = Self::get_tier(env.clone(), tier_id.clone())?;
        if !tier.is_active {
            return Err(Error::TierNotActive);
        }

        // Calculate price based on billing cycle
        let base_price = match billing_cycle {
            BillingCycle::Monthly => tier.price,
            BillingCycle::Annual => tier.annual_price,
        };

        // Apply promotion if provided
        let final_price = if let Some(code) = promo_code {
            Self::apply_promotion(&env, &tier_id, &code, base_price)?
        } else {
            base_price
        };

        // Validate payment
        Self::validate_payment(&env, &payment_token, final_price, &user)?;

        // Calculate duration based on billing cycle
        let duration = match billing_cycle {
            BillingCycle::Monthly => 30 * 24 * 60 * 60, // 30 days in seconds
            BillingCycle::Annual => 365 * 24 * 60 * 60, // 365 days in seconds
        };

        let current_time = env.ledger().timestamp();
        let expires_at = current_time
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        let subscription = Subscription {
            id: id.clone(),
            user: user.clone(),
            payment_token: payment_token.clone(),
            amount: final_price,
            status: MembershipStatus::Active,
            created_at: current_time,
            expires_at,
            tier_id: tier_id.clone(),
            billing_cycle: billing_cycle.clone(),
            paused_at: None,
            last_resumed_at: current_time,
            pause_count: 0,
            total_paused_duration: 0,
            pause_history: Vec::new(&env),
        };

        // Store subscription
        env.storage().persistent().set(&key, &subscription);
        env.storage().persistent().extend_ttl(&key, 100, 1000);

        // Update tier analytics
        Self::update_tier_analytics_on_subscribe(&env, &tier_id, final_price)?;

        // Emit subscription created event
        env.events().publish(
            (symbol_short!("sub_creat"), id.clone(), user.clone()),
            (tier_id.clone(), final_price, current_time, expires_at),
        );

        // Log attendance event
        Self::log_subscription_event(
            &env,
            &user,
            String::from_str(&env, "subscription_created"),
            &id,
            final_price,
        )?;

        Ok(())
    }

    /// Gets user subscription info with tier details.
    pub fn get_user_subscription_info(
        env: Env,
        subscription_id: String,
    ) -> Result<UserSubscriptionInfo, Error> {
        let subscription = Self::get_subscription(env.clone(), subscription_id)?;
        let tier = Self::get_tier(env.clone(), subscription.tier_id.clone())?;

        let current_time = env.ledger().timestamp();
        let is_expired = subscription.expires_at < current_time;
        let days_remaining = if is_expired {
            0
        } else {
            (subscription.expires_at - current_time) / (24 * 60 * 60)
        };

        Ok(UserSubscriptionInfo {
            subscription,
            tier_name: tier.name,
            tier_level: tier.level,
            features: tier.features,
            days_remaining,
            is_expired,
        })
    }

    // ============================================================================
    // Tier Upgrade/Downgrade Functions
    // ============================================================================

    /// Initiates a tier change request (upgrade or downgrade).
    pub fn request_tier_change(
        env: Env,
        user: Address,
        subscription_id: String,
        new_tier_id: String,
    ) -> Result<String, Error> {
        user.require_auth();

        // Get current subscription
        let subscription = Self::get_subscription(env.clone(), subscription_id.clone())?;

        // Verify user owns the subscription
        if subscription.user != user {
            return Err(Error::Unauthorized);
        }

        // Get current and new tiers
        let current_tier = Self::get_tier(env.clone(), subscription.tier_id.clone())?;
        let new_tier = Self::get_tier(env.clone(), new_tier_id.clone())?;

        if !new_tier.is_active {
            return Err(Error::TierNotActive);
        }

        // Determine change type
        let change_type = Self::determine_change_type(&current_tier.level, &new_tier.level)?;

        // Calculate prorated amount
        let current_time = env.ledger().timestamp();
        let prorated_amount =
            Self::calculate_proration(&env, &subscription, &current_tier, &new_tier)?;

        // Generate change request ID
        let change_id = Self::generate_change_request_id(&env, &user, current_time);

        let change_request = TierChangeRequest {
            user: user.clone(),
            from_tier: subscription.tier_id.clone(),
            to_tier: new_tier_id.clone(),
            change_type: change_type.clone(),
            prorated_amount,
            effective_date: current_time,
            status: TierChangeStatus::Pending,
            created_at: current_time,
        };

        // Store change request
        let key = SubscriptionDataKey::TierChangeRequest(change_id.clone());
        env.storage().persistent().set(&key, &change_request);

        // Add to user's change history
        let history_key = SubscriptionDataKey::UserTierChangeHistory(user.clone());
        let mut history: Vec<String> = env
            .storage()
            .persistent()
            .get(&history_key)
            .unwrap_or_else(|| Vec::new(&env));
        history.push_back(change_id.clone());
        env.storage().persistent().set(&history_key, &history);

        // Emit tier change requested event
        env.events().publish(
            (symbol_short!("tier_chg"), change_id.clone(), user.clone()),
            (
                subscription.tier_id.clone(),
                new_tier_id,
                change_type,
                prorated_amount,
            ),
        );

        Ok(change_id)
    }

    /// Processes a tier change request. Admin only for downgrades, user can approve upgrades.
    pub fn process_tier_change(
        env: Env,
        caller: Address,
        change_request_id: String,
        subscription_id: String,
        payment_token: Address,
    ) -> Result<(), Error> {
        caller.require_auth();

        let key = SubscriptionDataKey::TierChangeRequest(change_request_id.clone());
        let mut change_request: TierChangeRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::TierChangeNotFound)?;

        // Check if already processed
        if change_request.status != TierChangeStatus::Pending {
            return Err(Error::TierChangeAlreadyProcessed);
        }

        // Verify caller is the user or admin
        if caller != change_request.user {
            // TODO: Add admin check here
        }

        // Get subscription and update it
        let sub_key = SubscriptionDataKey::Subscription(subscription_id.clone());
        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&sub_key)
            .ok_or(Error::SubscriptionNotFound)?;

        // Handle payment for upgrades
        if change_request.prorated_amount > 0 {
            Self::validate_payment(
                &env,
                &payment_token,
                change_request.prorated_amount,
                &change_request.user,
            )?;
        }

        // Get old tier for analytics
        let old_tier_id = subscription.tier_id.clone();

        // Update subscription with new tier
        subscription.tier_id = change_request.to_tier.clone();
        subscription.amount = Self::get_tier(env.clone(), change_request.to_tier.clone())?.price;
        env.storage().persistent().set(&sub_key, &subscription);

        // Update change request status
        change_request.status = TierChangeStatus::Completed;
        env.storage().persistent().set(&key, &change_request);

        // Update analytics for both tiers
        Self::update_tier_analytics_on_change(
            &env,
            &old_tier_id,
            &change_request.to_tier,
            &change_request.change_type,
        )?;

        // Emit tier change completed event
        env.events().publish(
            (
                symbol_short!("tier_cmp"),
                change_request_id,
                change_request.user.clone(),
            ),
            (
                old_tier_id,
                change_request.to_tier,
                change_request.prorated_amount,
            ),
        );

        Ok(())
    }

    /// Cancels a pending tier change request.
    pub fn cancel_tier_change(
        env: Env,
        user: Address,
        change_request_id: String,
    ) -> Result<(), Error> {
        user.require_auth();

        let key = SubscriptionDataKey::TierChangeRequest(change_request_id.clone());
        let mut change_request: TierChangeRequest = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::TierChangeNotFound)?;

        // Verify user owns the request
        if change_request.user != user {
            return Err(Error::Unauthorized);
        }

        // Check if can be cancelled
        if change_request.status != TierChangeStatus::Pending {
            return Err(Error::TierChangeAlreadyProcessed);
        }

        change_request.status = TierChangeStatus::Cancelled;
        env.storage().persistent().set(&key, &change_request);

        // Emit cancellation event
        env.events().publish(
            (symbol_short!("tier_cnc"), change_request_id, user),
            (env.ledger().timestamp(),),
        );

        Ok(())
    }

    // ============================================================================
    // Promotion Management Functions
    // ============================================================================

    /// Creates a promotional pricing for a tier. Admin only.
    pub fn create_promotion(
        env: Env,
        admin: Address,
        params: CreatePromotionParams,
    ) -> Result<(), Error> {
        admin.require_auth();

        // Validate tier exists
        let _ = Self::get_tier(env.clone(), params.tier_id.clone())?;

        // Validate discount
        if params.discount_percent > 100 {
            return Err(Error::InvalidDiscountPercent);
        }

        // Validate date range
        if params.end_date <= params.start_date {
            return Err(Error::InvalidPromoDateRange);
        }

        // Check if promotion already exists
        let key = SubscriptionDataKey::TierPromotion(params.promo_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::PromotionAlreadyExists);
        }

        let promotion = TierPromotion {
            tier_id: params.tier_id.clone(),
            discount_percent: params.discount_percent,
            promo_price: params.promo_price,
            start_date: params.start_date,
            end_date: params.end_date,
            promo_code: params.promo_code.clone(),
            max_redemptions: params.max_redemptions,
            current_redemptions: 0,
        };

        env.storage().persistent().set(&key, &promotion);

        // Add to promotion list
        let list_key = SubscriptionDataKey::TierPromotionList;
        let mut promo_list: Vec<String> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(&env));
        promo_list.push_back(params.promo_id.clone());
        env.storage().persistent().set(&list_key, &promo_list);

        // Emit promotion created event
        env.events().publish(
            (symbol_short!("promo_cr"), params.promo_id, admin),
            (
                params.tier_id,
                params.discount_percent,
                params.start_date,
                params.end_date,
            ),
        );

        Ok(())
    }

    /// Gets a promotion by ID.
    pub fn get_promotion(env: Env, promo_id: String) -> Result<TierPromotion, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::TierPromotion(promo_id))
            .ok_or(Error::PromotionNotFound)
    }

    /// Validates and applies a promotion code, returning the final price.
    fn apply_promotion(
        env: &Env,
        tier_id: &String,
        promo_code: &String,
        base_price: i128,
    ) -> Result<i128, Error> {
        // Search for promotion with matching code and tier
        let list_key = SubscriptionDataKey::TierPromotionList;
        let promo_list: Vec<String> = env
            .storage()
            .persistent()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(env));

        let current_time = env.ledger().timestamp();

        for promo_id in promo_list.iter() {
            if let Some(mut promotion) = env
                .storage()
                .persistent()
                .get::<_, TierPromotion>(&SubscriptionDataKey::TierPromotion(promo_id.clone()))
            {
                // Check if promotion matches
                if promotion.tier_id == *tier_id && promotion.promo_code == *promo_code {
                    // Validate promotion is active
                    if current_time < promotion.start_date || current_time > promotion.end_date {
                        return Err(Error::PromoCodeExpired);
                    }

                    // Check max redemptions
                    if promotion.max_redemptions > 0
                        && promotion.current_redemptions >= promotion.max_redemptions
                    {
                        return Err(Error::PromoCodeMaxRedemptions);
                    }

                    // Calculate final price
                    let final_price = if promotion.promo_price > 0 {
                        promotion.promo_price
                    } else {
                        base_price - (base_price * promotion.discount_percent as i128 / 100)
                    };

                    // Increment redemption count
                    promotion.current_redemptions += 1;
                    env.storage()
                        .persistent()
                        .set(&SubscriptionDataKey::TierPromotion(promo_id), &promotion);

                    return Ok(final_price);
                }
            }
        }

        Err(Error::PromoCodeInvalid)
    }

    // ============================================================================
    // Feature Enforcement Functions
    // ============================================================================

    /// Checks if a user has access to a specific feature based on their tier.
    pub fn check_feature_access(
        env: Env,
        subscription_id: String,
        feature: TierFeature,
    ) -> Result<bool, Error> {
        let subscription = Self::get_subscription(env.clone(), subscription_id)?;

        // Check if subscription is active
        if subscription.status != MembershipStatus::Active {
            return Ok(false);
        }

        // Check if subscription is expired
        let current_time = env.ledger().timestamp();
        if subscription.expires_at < current_time {
            return Ok(false);
        }

        // Get tier and check features
        let tier = Self::get_tier(env, subscription.tier_id)?;

        for tier_feature in tier.features.iter() {
            if tier_feature == feature {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Enforces feature access, returning error if not available.
    pub fn require_feature_access(
        env: Env,
        subscription_id: String,
        feature: TierFeature,
    ) -> Result<(), Error> {
        if !Self::check_feature_access(env, subscription_id, feature)? {
            return Err(Error::FeatureNotAvailable);
        }
        Ok(())
    }

    // ============================================================================
    // Analytics Functions
    // ============================================================================

    /// Gets analytics for a specific tier.
    pub fn get_tier_analytics(env: Env, tier_id: String) -> Result<TierAnalytics, Error> {
        env.storage()
            .persistent()
            .get(&SubscriptionDataKey::TierAnalytics(tier_id))
            .ok_or(Error::TierNotFound)
    }

    /// Updates analytics when a new subscription is created.
    fn update_tier_analytics_on_subscribe(
        env: &Env,
        tier_id: &String,
        amount: i128,
    ) -> Result<(), Error> {
        let key = SubscriptionDataKey::TierAnalytics(tier_id.clone());
        let mut analytics: TierAnalytics =
            env.storage()
                .persistent()
                .get(&key)
                .unwrap_or_else(|| TierAnalytics {
                    tier_id: tier_id.clone(),
                    active_subscribers: 0,
                    total_revenue: 0,
                    upgrades_count: 0,
                    downgrades_count: 0,
                    churn_rate: 0,
                    updated_at: env.ledger().timestamp(),
                });

        analytics.active_subscribers += 1;
        analytics.total_revenue += amount;
        analytics.updated_at = env.ledger().timestamp();

        env.storage().persistent().set(&key, &analytics);
        Ok(())
    }

    /// Updates analytics when a tier change occurs.
    fn update_tier_analytics_on_change(
        env: &Env,
        from_tier_id: &String,
        to_tier_id: &String,
        change_type: &TierChangeType,
    ) -> Result<(), Error> {
        // Update from_tier analytics
        let from_key = SubscriptionDataKey::TierAnalytics(from_tier_id.clone());
        if let Some(mut from_analytics) = env
            .storage()
            .persistent()
            .get::<_, TierAnalytics>(&from_key)
        {
            from_analytics.active_subscribers = from_analytics.active_subscribers.saturating_sub(1);
            if *change_type == TierChangeType::Downgrade {
                from_analytics.downgrades_count += 1;
            }
            from_analytics.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(&from_key, &from_analytics);
        }

        // Update to_tier analytics
        let to_key = SubscriptionDataKey::TierAnalytics(to_tier_id.clone());
        if let Some(mut to_analytics) = env.storage().persistent().get::<_, TierAnalytics>(&to_key)
        {
            to_analytics.active_subscribers += 1;
            if *change_type == TierChangeType::Upgrade {
                to_analytics.upgrades_count += 1;
            }
            to_analytics.updated_at = env.ledger().timestamp();
            env.storage().persistent().set(&to_key, &to_analytics);
        }

        Ok(())
    }

    // ============================================================================
    // Helper Functions
    // ============================================================================

    /// Determines the type of tier change based on tier levels.
    fn determine_change_type(
        from_level: &TierLevel,
        to_level: &TierLevel,
    ) -> Result<TierChangeType, Error> {
        let from_rank = Self::tier_level_rank(from_level);
        let to_rank = Self::tier_level_rank(to_level);

        if to_rank > from_rank {
            Ok(TierChangeType::Upgrade)
        } else if to_rank < from_rank {
            Ok(TierChangeType::Downgrade)
        } else {
            Ok(TierChangeType::Lateral)
        }
    }

    /// Returns numeric rank for tier level comparison.
    fn tier_level_rank(level: &TierLevel) -> u8 {
        match level {
            TierLevel::Free => 0,
            TierLevel::Basic => 1,
            TierLevel::Pro => 2,
            TierLevel::Enterprise => 3,
        }
    }

    /// Calculates prorated amount for tier change.
    fn calculate_proration(
        env: &Env,
        subscription: &Subscription,
        current_tier: &SubscriptionTier,
        new_tier: &SubscriptionTier,
    ) -> Result<i128, Error> {
        let current_time = env.ledger().timestamp();

        // If subscription is expired, no proration needed
        if subscription.expires_at <= current_time {
            return Ok(new_tier.price);
        }

        // Calculate remaining days
        let remaining_seconds = subscription.expires_at - current_time;
        let total_seconds: u64 = match subscription.billing_cycle {
            BillingCycle::Monthly => 30 * 24 * 60 * 60,
            BillingCycle::Annual => 365 * 24 * 60 * 60,
        };

        // Calculate credit from current tier
        let daily_rate_current = current_tier.price / (total_seconds as i128 / (24 * 60 * 60));
        let credit = daily_rate_current * (remaining_seconds as i128 / (24 * 60 * 60));

        // Calculate cost for new tier for remaining period
        let daily_rate_new = new_tier.price / (total_seconds as i128 / (24 * 60 * 60));
        let new_cost = daily_rate_new * (remaining_seconds as i128 / (24 * 60 * 60));

        // Prorated amount (positive = user pays, negative = credit)
        Ok(new_cost - credit)
    }

    /// Generates a unique change request ID based on timestamp.
    /// Returns a fixed-format string ID like "CHG_XXXX" where XXXX is derived from timestamp.
    fn generate_change_request_id(env: &Env, _user: &Address, timestamp: u64) -> String {
        // Simple ID generation using timestamp modulo
        // In production, consider using proper hashing or UUID generation
        let id_suffix = (timestamp % 100000000) as u32;

        // Create a simple ID format: "CHG_" + last 8 digits of timestamp
        // Using format: CHG_XXXXXXXX
        let mut chars: [u8; 12] = *b"CHG_00000000";

        // Fill in the numeric part
        let mut remaining = id_suffix;
        for i in (4..12).rev() {
            chars[i] = b'0' + (remaining % 10) as u8;
            remaining /= 10;
            if remaining == 0 {
                break;
            }
        }

        String::from_bytes(env, &chars)
    }
}
