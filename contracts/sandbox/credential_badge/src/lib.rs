// contracts/sandbox/credential_badge/src/lib.rs
#![no_std]

mod errors;
mod types;

pub use errors::Error;
pub use types::{BadgeType, Credential};

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

// ── Storage keys ──────────────────────────────────────────────────────────────
#[cfg(test)]
mod test;

pub use errors::Error;
pub use types::{BadgeType, Credential};

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
pub enum DataKey {
    Admin,
    BadgeType(String),
    BadgeTypeList,
    Credential(String, Address),
    HolderCredentials(Address),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct CredentialBadgeContract;

#[contractimpl]
impl CredentialBadgeContract {
    // ── Helpers ───────────────────────────────────────────────────────────────
    // ── Internal helpers ──────────────────────────────────────────────────────

    fn get_admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::AdminNotSet)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin = Self::get_admin(env)?;
        if caller != &admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    // ── CT-22: initialize stub ────────────────────────────────────────────────
    // ── Initialisation ────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    // ── CT-23: register_badge_type ────────────────────────────────────────────

    // ── Badge type management ─────────────────────────────────────────────────

    /// Register a new badge type (admin only).
    pub fn register_badge_type(
        env: Env,
        caller: Address,
        id: String,
        name: String,
        description: String,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        if env
            .storage()
            .persistent()
            .has(&DataKey::BadgeType(id.clone()))
        {
            return Err(Error::BadgeTypeAlreadyExists);
        }

        let badge = BadgeType {
            id: id.clone(),
            name,
            description,
            created_at: env.ledger().timestamp(),
            issuer: caller,
        };
        env.storage()
            .persistent()
            .set(&DataKey::BadgeType(id.clone()), &badge);

        let mut list: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::BadgeTypeList)
            .unwrap_or(Vec::new(&env));
        list.push_back(id.clone());
        list.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::BadgeTypeList, &list);

        env.events()
            .publish((symbol_short!("badge_reg"),), badge);
        Ok(())
    }

    // ── CT-24: issue_credential ───────────────────────────────────────────────

        Ok(())
    }

    /// Issue a credential to a holder (admin only).
    pub fn issue_credential(
        env: Env,
        caller: Address,
        badge_type_id: String,
        holder: Address,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        if !env
            .storage()
            .persistent()
            .has(&DataKey::BadgeType(badge_type_id.clone()))
        {
            return Err(Error::BadgeTypeNotFound);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::Credential(badge_type_id.clone(), holder.clone()))
        {
            return Err(Error::AlreadyIssued);
        }

        let credential = Credential {
            badge_type_id: badge_type_id.clone(),
            holder: holder.clone(),
            issued_at: env.ledger().timestamp(),
            issuer: caller,
            is_revoked: false,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Credential(badge_type_id.clone(), holder.clone()), &credential);
        let key = DataKey::Credential(badge_type_id.clone(), holder.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::CredentialAlreadyIssued);
        }

        let cred = Credential {
            badge_type_id: badge_type_id.clone(),
            holder: holder.clone(),
            issued_at: env.ledger().timestamp(),
            revoked: false,
        };
        env.storage().persistent().set(&key, &cred);

        let mut holder_creds: Vec<String> = env
            .storage()
            .persistent()
            .get(&DataKey::HolderCredentials(holder.clone()))
            .unwrap_or(Vec::new(&env));
        holder_creds.push_back(badge_type_id);
        env.storage()
            .persistent()
            .set(&DataKey::HolderCredentials(holder), &holder_creds);

        env.events()
            .publish((symbol_short!("issued"),), credential);
        Ok(())
    }

    // ── CT-25: revoke_credential ──────────────────────────────────────────────

        Ok(())
    }

    /// Revoke a credential (admin only).
    pub fn revoke_credential(
        env: Env,
        caller: Address,
        badge_type_id: String,
        holder: Address,
    ) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;

        let key = DataKey::Credential(badge_type_id.clone(), holder.clone());
        let mut credential: Credential = env
        let mut cred: Credential = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::CredentialNotFound)?;

        if credential.is_revoked {
            return Err(Error::CredentialRevoked);
        }

        credential.is_revoked = true;
        env.storage().persistent().set(&key, &credential);

        env.events()
            .publish((symbol_short!("revoked"),), credential);
        Ok(())
        cred.revoked = true;
        env.storage().persistent().set(&key, &cred);
        Ok(())
    }

    // ── CT-26: Badge verification queries ─────────────────────────────────────

    /// Returns `true` only if the credential exists and is not revoked.
    pub fn verify_credential(env: Env, badge_type_id: String, holder: Address) -> bool {
        let key = DataKey::Credential(badge_type_id, holder);
        match env
            .storage()
            .persistent()
            .get::<DataKey, Credential>(&key)
        {
            Some(cred) => !cred.revoked,
            None => false,
        }
    }

    /// Returns the full credential record.
    pub fn get_credential(
        env: Env,
        badge_type_id: String,
        holder: Address,
    ) -> Result<Credential, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Credential(badge_type_id, holder))
            .ok_or(Error::CredentialNotFound)
    }

    /// Returns the badge type details.
    pub fn get_badge_type(env: Env, id: String) -> Result<BadgeType, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::BadgeType(id))
            .ok_or(Error::BadgeTypeNotFound)
    }

    // ── CT-27: Listing queries ────────────────────────────────────────────────

    /// Returns all badge type IDs the holder has been issued.
    pub fn get_holder_credentials(env: Env, holder: Address) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::HolderCredentials(holder))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns all registered badge type IDs.
    pub fn get_all_badge_types(env: Env) -> Vec<String> {
        env.storage()
            .persistent()
            .get(&DataKey::BadgeTypeList)
            .unwrap_or(Vec::new(&env))
    }
}
