#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, symbol_short
};

#[contract]
pub struct AccessControl;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    UserRoles(Address),
    RoleMembers(String),
    RoleExists(String),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    RoleAlreadyExists = 2,
    RoleDoesNotExist = 3,
    UserAlreadyHasRole = 4,
    UserDoesNotHaveRole = 5,
    AdminRequired = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueryMsg {
    pub check_access: CheckAccessQuery,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CheckAccessQuery {
    pub caller: Address,
    pub required_role: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AccessResponse {
    pub has_access: bool,
}

#[contractimpl]
impl AccessControl {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        env.storage().instance().set(&DataKey::Admin, &admin);

        // Create default admin role
        let admin_role = String::from_str(&env, "Admin");
        Self::create_role_internal(&env, &admin_role)?;
        Self::grant_role_internal(&env, &admin, &admin_role)?;

        // Create default roles
        let minter_role = String::from_str(&env, "Minter");
        let transferer_role = String::from_str(&env, "Transferer");
        Self::create_role_internal(&env, &minter_role)?;
        Self::create_role_internal(&env, &transferer_role)?;

        env.events().publish((symbol_short!("init"), admin), ());

        Ok(())
    }

    pub fn create_role(env: Env, admin: Address, role: String) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        Self::create_role_internal(&env, &role)
    }

    pub fn grant_role(env: Env, admin: Address, user: Address, role: String) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        Self::grant_role_internal(&env, &user, &role)
    }

    pub fn revoke_role(env: Env, admin: Address, user: Address, role: String) -> Result<(), Error> {
        admin.require_auth();
        Self::require_admin(&env, &admin)?;
        Self::revoke_role_internal(&env, &user, &role)
    }

    pub fn check_access(env: Env, query: QueryMsg) -> AccessResponse {
        let has_access = match Self::has_role(env.clone(), query.check_access.caller.clone(), query.check_access.required_role.clone()) {
            Ok(has_role) => has_role,
            Err(_) => false,
        };

        AccessResponse { has_access }
    }

    pub fn has_role(env: Env, user: Address, role: String) -> Result<bool, Error> {
        // Check if role exists
        let role_exists = env.storage().persistent()
            .get(&DataKey::RoleExists(role.clone()))
            .unwrap_or(false);

        if !role_exists {
            return Err(Error::RoleDoesNotExist);
        }

        // Check if user has the role
        let user_roles: Vec<String> = env.storage().persistent()
            .get(&DataKey::UserRoles(user.clone()))
            .unwrap_or_else(|| Vec::new(&env));

        Ok(user_roles.contains(role.clone()))
    }

    pub fn get_user_roles(env: Env, user: Address) -> Vec<String> {
        env.storage().persistent()
            .get(&DataKey::UserRoles(user))
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn get_role_members(env: Env, role: String) -> Result<Vec<Address>, Error> {
        let role_exists = env.storage().persistent()
            .get(&DataKey::RoleExists(role.clone()))
            .unwrap_or(false);

        if !role_exists {
            return Err(Error::RoleDoesNotExist);
        }

        Ok(env.storage().persistent()
            .get(&DataKey::RoleMembers(role))
            .unwrap_or_else(|| Vec::new(&env)))
    }

    pub fn is_admin(env: Env, user: Address) -> bool {
        let admin_role = String::from_str(&env, "Admin");
        Self::has_role(env.clone(), user.clone(), admin_role).unwrap_or(false)
    }

    fn create_role_internal(env: &Env, role: &String) -> Result<(), Error> {
        let role_exists = env.storage().persistent()
            .get(&DataKey::RoleExists(role.clone()))
            .unwrap_or(false);

        if role_exists {
            return Err(Error::RoleAlreadyExists);
        }

        env.storage().persistent().set(&DataKey::RoleExists(role.clone()), &true);
        env.storage().persistent().set(&DataKey::RoleMembers(role.clone()), &Vec::<Address>::new(env));

        env.events().publish((symbol_short!("role_new"), role.clone()), ());

        Ok(())
    }

    fn grant_role_internal(env: &Env, user: &Address, role: &String) -> Result<(), Error> {
        // Check if role exists
        let role_exists = env.storage().persistent()
            .get(&DataKey::RoleExists(role.clone()))
            .unwrap_or(false);

        if !role_exists {
            return Err(Error::RoleDoesNotExist);
        }

        // Get current user roles
        let mut user_roles: Vec<String> = env.storage().persistent()
            .get(&DataKey::UserRoles(user.clone()))
            .unwrap_or_else(|| Vec::new(env));

        if user_roles.contains(role.clone()) {
            return Err(Error::UserAlreadyHasRole);
        }

        // Add role to user
        user_roles.push_back(role.clone());
        env.storage().persistent().set(&DataKey::UserRoles(user.clone()), &user_roles);

        // Add user to role members
        let mut role_members: Vec<Address> = env.storage().persistent()
            .get(&DataKey::RoleMembers(role.clone()))
            .unwrap_or_else(|| Vec::new(env));

        role_members.push_back(user.clone());
        env.storage().persistent().set(&DataKey::RoleMembers(role.clone()), &role_members);

        env.events().publish((symbol_short!("role_give"), user.clone(), role.clone()), ());

        Ok(())
    }

    fn revoke_role_internal(env: &Env, user: &Address, role: &String) -> Result<(), Error> {
        // Check if role exists
        let role_exists = env.storage().persistent()
            .get(&DataKey::RoleExists(role.clone()))
            .unwrap_or(false);

        if !role_exists {
            return Err(Error::RoleDoesNotExist);
        }

        // Get current user roles
        let user_roles: Vec<String> = env.storage().persistent()
            .get(&DataKey::UserRoles(user.clone()))
            .unwrap_or_else(|| Vec::new(env));

        if !user_roles.contains(role.clone()) {
            return Err(Error::UserDoesNotHaveRole);
        }

        // Remove role from user
        let mut new_user_roles = Vec::new(&env);
        for r in user_roles.iter() {
            if r.clone() != role.clone() {
                new_user_roles.push_back(r.clone());
            }
        }
        env.storage().persistent().set(&DataKey::UserRoles(user.clone()), &new_user_roles);

        // Remove user from role members
        let role_members: Vec<Address> = env.storage().persistent()
            .get(&DataKey::RoleMembers(role.clone()))
            .unwrap_or_else(|| Vec::new(env));

        let mut new_role_members = Vec::new(&env);
        for member in role_members.iter() {
            if member.clone() != user.clone() {
                new_role_members.push_back(member.clone());
            }
        }
        env.storage().persistent().set(&DataKey::RoleMembers(role.clone()), &new_role_members);

        env.events().publish((symbol_short!("role_take"), user.clone(), role.clone()), ());

        Ok(())
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance()
            .get(&DataKey::Admin)
            .ok_or(Error::Unauthorized)?;

        if caller != &admin && !Self::is_admin(env.clone(), caller.clone()) {
            return Err(Error::AdminRequired);
        }

        Ok(())
    }
}

mod test;