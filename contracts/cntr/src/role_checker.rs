use std::collections::HashMap;

/// Simple in-memory role registry for access control.
#[derive(Default)]
pub struct RoleRegistry {
    roles: HashMap<String, Vec<String>>,
}

impl RoleRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Grants a role to an address. Idempotent — duplicate grants are ignored.
    pub fn grant_role(&mut self, address: &str, role: &str) {
        let roles = self.roles.entry(address.to_string()).or_default();
        if !roles.contains(&role.to_string()) {
            roles.push(role.to_string());
        }
    }

    /// Revokes a role from an address. No-op if the role is not held.
    pub fn revoke_role(&mut self, address: &str, role: &str) {
        if let Some(roles) = self.roles.get_mut(address) {
            roles.retain(|r| r != role);
        }
    }

    /// Returns true if the address holds the given role.
    pub fn has_role(&self, address: &str, role: &str) -> bool {
        self.roles
            .get(address)
            .map(|roles| roles.contains(&role.to_string()))
            .unwrap_or(false)
    }

    /// Returns all roles held by an address.
    pub fn get_roles(&self, address: &str) -> Vec<String> {
        self.roles.get(address).cloned().unwrap_or_default()
    }
}
