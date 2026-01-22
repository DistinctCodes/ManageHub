use crate::errors::Error;
use crate::types::MembershipStatus;
use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env};

#[contracttype]
pub enum DataKey {
    Token(BytesN<32>),
    Admin,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct MembershipToken {
    pub id: BytesN<32>,
    pub user: Address,
    pub status: MembershipStatus,
    pub issue_date: u64,
    pub expiry_date: u64,
}

pub struct MembershipTokenContract;

impl MembershipTokenContract {
    pub fn issue_token(
        env: Env,
        id: BytesN<32>,
        user: Address,
        expiry_date: u64,
    ) -> Result<(), Error> {
        // Get admin from storage - if no admin is set, this will panic
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)?;
        admin.require_auth();

        // Check if token already exists
        if env.storage().persistent().has(&DataKey::Token(id.clone())) {
            return Err(Error::TokenAlreadyIssued);
        }

        // Validate expiry date (must be in the future)
        let current_time = env.ledger().timestamp();
        if expiry_date <= current_time {
            return Err(Error::InvalidExpiryDate);
        }

        // Create and store token
        let token = MembershipToken {
            id: id.clone(),
            user: user.clone(),
            status: MembershipStatus::Active,
            issue_date: current_time,
            expiry_date,
        };
        env.storage().persistent().set(&DataKey::Token(id.clone()), &token);

        // Emit token issued event
        env.events().publish(
            (symbol_short!("token_iss"), id.clone(), user.clone()),
            (admin.clone(), current_time, expiry_date, MembershipStatus::Active)
        );

        Ok(())
    }

    pub fn transfer_token(env: Env, id: BytesN<32>, new_user: Address) -> Result<(), Error> {
        // Retrieve token
        let mut token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id.clone()))
            .ok_or(Error::TokenNotFound)?;

        // Check if token is active
        if token.status != MembershipStatus::Active {
            return Err(Error::TokenExpired);
        }

        // Require current user authorization
        token.user.require_auth();

        // Capture old user for event emission
        let old_user = token.user.clone();

        // Update token owner
        token.user = new_user.clone();
        env.storage().persistent().set(&DataKey::Token(id.clone()), &token);

        // Emit token transferred event
        env.events().publish(
            (symbol_short!("token_xfr"), id.clone(), new_user.clone()),
            (old_user, env.ledger().timestamp())
        );

        Ok(())
    }

    pub fn get_token(env: Env, id: BytesN<32>) -> Result<MembershipToken, Error> {
        // Retrieve token
        let token: MembershipToken = env
            .storage()
            .persistent()
            .get(&DataKey::Token(id))
            .ok_or(Error::TokenNotFound)?;

        // Check token status based on expiry date
        let current_time = env.ledger().timestamp();
        if token.status == MembershipStatus::Active && current_time > token.expiry_date {
            return Err(Error::TokenExpired);
        }

        Ok(token)
    }

    pub fn set_admin(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Emit admin set event
        env.events().publish(
            (symbol_short!("admin_set"), admin.clone()),
            env.ledger().timestamp()
        );

        Ok(())
    }
}
