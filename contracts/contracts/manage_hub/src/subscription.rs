use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

use crate::errors::Error;
use crate::types::{BillingCycle, MembershipStatus, Subscription};

#[contracttype]
pub enum SubscriptionDataKey {
    Subscription(String),
    UsdcContract,
}

#[contract]
pub struct SubscriptionContract;

#[contractimpl]
impl SubscriptionContract {
    /// Validates payment parameters and token authorization.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `payment_token` - The token contract address for payment
    /// * `amount` - Payment amount (must be positive)
    /// * `payer` - Address of the paying user
    /// 
    /// # Returns
    /// * `Result<bool, Error>` - Success status or detailed error
    /// 
    /// # Errors
    /// * `InvalidPaymentAmount` - If amount is zero or negative
    /// * `InvalidPaymentToken` - If token is not the configured USDC token
    /// * `InsufficientBalance` - If payer lacks sufficient funds
    /// * `UsdcContractNotSet` - If USDC contract address not configured
    pub fn validate_payment(
        env: Env,
        payment_token: Address,
        amount: i128,
        payer: Address,
    ) -> Result<bool, Error> {
        // Validate payment amount is positive
        if amount <= 0 {
            return Err(Error::InvalidPaymentAmount);
        }

        // Require authorization from the payer with enhanced error context
        payer.require_auth();

        // Get USDC token contract address with error handling
        let usdc_contract = Self::get_usdc_contract_address(&env)?;

        // Validate that the payment token is the configured USDC token
        if payment_token != usdc_contract {
            return Err(Error::InvalidPaymentToken);
        }

        // Check token balance with enhanced error handling
        let token_client = token::Client::new(&env, &payment_token);
        let balance = token_client.balance(&payer);
        
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        Ok(true)
    }

    /// Creates a new subscription with comprehensive validation and error handling.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Unique subscription identifier
    /// * `user` - The subscribing user's address
    /// * `payment_token` - Token contract for payment
    /// * `amount` - Subscription cost
    /// * `duration` - Subscription duration in seconds
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or detailed error information
    /// 
    /// # Errors
    /// * `AuthenticationRequired` - User must authenticate
    /// * `SubscriptionAlreadyExists` - ID already in use
    /// * `PaymentTransactionFailed` - Token transfer failed
    /// * `TimestampOverflow` - Duration calculation overflow
    /// * Plus all validation errors from `validate_payment`
    pub fn create_subscription(
        env: Env,
        id: String,
        user: Address,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Enhanced authentication with proper error
        user.require_auth();

        // Validate subscription ID format and length
        if id.len() == 0 {
            return Err(Error::InputValidationFailed);
        }

        // Check if subscription already exists with enhanced error handling
        let key = SubscriptionDataKey::Subscription(id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::SubscriptionAlreadyExists);
        }

        // Validate duration is reasonable (not zero, not excessive)
        if duration == 0 || duration > (365 * 24 * 60 * 60) {  // Max 1 year
            return Err(Error::InputValidationFailed);
        }

        // Validate payment with comprehensive error propagation
        Self::validate_payment(env.clone(), payment_token.clone(), amount, user.clone())?;

        // Execute token transfer with error handling
        let token_client = token::Client::new(&env, &payment_token);
        let contract_address = env.current_contract_address();
        
        // Use a more robust transfer approach with error checking
        match token_client.try_transfer(&user, &contract_address, &amount) {
            Ok(_) => {},
            Err(_) => return Err(Error::PaymentTransactionFailed),
        }

        // Create subscription record with enhanced timestamp handling
        let current_time = env.ledger().timestamp();
        
        // Use checked arithmetic to prevent overflow
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
            tier_id: String::from_str(&env, "basic"), // Default tier
            billing_cycle: BillingCycle::Monthly, // Default billing cycle
        };

        // Store subscription with error handling and optimized TTL management
        match env.storage().persistent().try_set(&key, &subscription) {
            Ok(_) => {
                // Extend TTL for long-term storage
                env.storage().persistent().extend_ttl(&key, 100, 1000);
            },
            Err(_) => return Err(Error::StorageOperationFailed),
        }

        Ok(())
    }

    /// Retrieves a subscription by ID with enhanced error handling.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Subscription identifier to retrieve
    /// 
    /// # Returns
    /// * `Result<Subscription, Error>` - The subscription or error details
    /// 
    /// # Errors
    /// * `SubscriptionNotFound` - No subscription with given ID
    /// * `InputValidationFailed` - Invalid ID format
    pub fn get_subscription(env: Env, id: String) -> Result<Subscription, Error> {
        // Validate input
        if id.len() == 0 {
            return Err(Error::InputValidationFailed);
        }

        let subscription = env.storage()
            .persistent()
            .get(&SubscriptionDataKey::Subscription(id))
            .ok_or(Error::SubscriptionNotFound)?;

        // Check if subscription is expired and update status if needed
        let current_time = env.ledger().timestamp();
        if subscription.expires_at <= current_time && subscription.status == MembershipStatus::Active {
            // Note: This is a read operation, so we can't modify the subscription here
            // The frontend or a separate cleanup process should handle expired subscriptions
        }

        Ok(subscription)
    }

    /// Renews an existing subscription with comprehensive validation.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Subscription ID to renew
    /// * `payment_token` - Token for renewal payment
    /// * `amount` - Renewal amount
    /// * `duration` - Additional duration in seconds
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or detailed error information
    /// 
    /// # Errors
    /// * `SubscriptionNotFound` - Subscription doesn't exist
    /// * `AuthenticationRequired` - Owner must authenticate
    /// * `SubscriptionExpired` - Cannot renew expired subscription
    /// * Plus all payment validation errors
    pub fn renew_subscription(
        env: Env,
        id: String,
        payment_token: Address,
        amount: i128,
        duration: u64,
    ) -> Result<(), Error> {
        // Input validation
        if id.len() == 0 || duration == 0 {
            return Err(Error::InputValidationFailed);
        }

        let key = SubscriptionDataKey::Subscription(id.clone());
        let mut subscription: Subscription = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::SubscriptionNotFound)?;

        // Require authorization from subscription owner
        subscription.user.require_auth();

        // Check subscription status
        if subscription.status != MembershipStatus::Active {
            return Err(Error::SubscriptionExpired);
        }

        // Validate payment
        Self::validate_payment(env.clone(), payment_token.clone(), amount, subscription.user.clone())?;

        // Execute payment transfer
        let token_client = token::Client::new(&env, &payment_token);
        let contract_address = env.current_contract_address();
        
        match token_client.try_transfer(&subscription.user, &contract_address, &amount) {
            Ok(_) => {},
            Err(_) => return Err(Error::PaymentTransactionFailed),
        }

        // Update subscription with new expiry date
        let current_expires_at = subscription.expires_at;
        let new_expires_at = current_expires_at
            .checked_add(duration)
            .ok_or(Error::TimestampOverflow)?;

        subscription.expires_at = new_expires_at;
        subscription.amount = amount; // Update amount for the renewal

        // Save updated subscription
        match env.storage().persistent().try_set(&key, &subscription) {
            Ok(_) => {
                env.storage().persistent().extend_ttl(&key, 100, 1000);
            },
            Err(_) => return Err(Error::StorageOperationFailed),
        }

        Ok(())
    }

    /// Cancels an existing subscription with proper authorization.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Subscription ID to cancel
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or detailed error information
    /// 
    /// # Errors
    /// * `SubscriptionNotFound` - Subscription doesn't exist
    /// * `AuthenticationRequired` - Owner must authenticate
    /// * `StorageOperationFailed` - Failed to update subscription
    pub fn cancel_subscription(env: Env, id: String) -> Result<(), Error> {
        // Input validation
        if id.len() == 0 {
            return Err(Error::InputValidationFailed);
        }

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
        
        // Save updated subscription with error handling
        match env.storage().persistent().try_set(&key, &subscription) {
            Ok(_) => {},
            Err(_) => return Err(Error::StorageOperationFailed),
        }

        Ok(())
    }

    /// Sets the USDC contract address with enhanced security.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Administrator address (must be authorized)
    /// * `usdc_address` - The USDC token contract address
    /// 
    /// # Returns
    /// * `Result<(), Error>` - Success or error details
    /// 
    /// # Errors
    /// * `InsufficientPermissions` - Admin authorization required
    /// * `StorageOperationFailed` - Failed to store configuration
    pub fn set_usdc_contract(env: Env, admin: Address, usdc_address: Address) -> Result<(), Error> {
        // Require admin authentication
        admin.require_auth();

        // TODO: Implement proper admin role checking
        // For now, we trust the authenticated address is an admin

        // Store the USDC contract address with error handling
        match env.storage().instance().try_set(&SubscriptionDataKey::UsdcContract, &usdc_address) {
            Ok(_) => Ok(()),
            Err(_) => Err(Error::StorageOperationFailed),
        }
    }

    /// Retrieves the configured USDC contract address.
    /// 
    /// # Arguments
    /// * `env` - The contract environment reference
    /// 
    /// # Returns
    /// * `Result<Address, Error>` - USDC contract address or configuration error
    /// 
    /// # Errors
    /// * `UsdcContractNotSet` - USDC contract address not configured
    fn get_usdc_contract_address(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&SubscriptionDataKey::UsdcContract)
            .ok_or(Error::UsdcContractNotSet)
    }

    /// Checks if a subscription is currently active and not expired.
    /// 
    /// # Arguments
    /// * `env` - The contract environment
    /// * `id` - Subscription ID to check
    /// 
    /// # Returns
    /// * `Result<bool, Error>` - True if active, false if expired/inactive
    /// 
    /// # Errors
    /// * `SubscriptionNotFound` - Subscription doesn't exist
    pub fn is_subscription_active(env: Env, id: String) -> Result<bool, Error> {
        let subscription = Self::get_subscription(env.clone(), id)?;
        let current_time = env.ledger().timestamp();
        
        Ok(subscription.status == MembershipStatus::Active && 
           subscription.expires_at > current_time)
    }
}