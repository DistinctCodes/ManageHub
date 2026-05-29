pub fn has_role(roles: &[(String, String)], address: &str, required_role: &str) -> bool {
    roles.iter().any(|(addr, role)| addr == address && role == required_role)
}

pub fn get_roles_for_address(roles: &[(String, String)], address: &str) -> Vec<String> {
    roles.iter().filter(|(addr, _)| addr == address).map(|(_, role)| role.clone()).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pair(a: &str, r: &str) -> (String, String) {
        (a.to_string(), r.to_string())
    }

    #[test]
    fn has_role_empty() {
        assert!(!has_role(&[], "alice", "admin"));
    }

    #[test]
    fn has_role_match() {
        let roles = vec![pair("alice", "admin")];
        assert!(has_role(&roles, "alice", "admin"));
    }

    #[test]
    fn has_role_case_sensitive() {
        let roles = vec![pair("alice", "Admin")];
        assert!(!has_role(&roles, "alice", "admin"));
    }

    #[test]
    fn has_role_wrong_address() {
        let roles = vec![pair("alice", "admin")];
        assert!(!has_role(&roles, "Alice", "admin"));
    }

    #[test]
    fn get_roles_multiple() {
        let roles = vec![pair("alice", "admin"), pair("alice", "member"), pair("bob", "member")];
        let mut result = get_roles_for_address(&roles, "alice");
        result.sort();
        assert_eq!(result, vec!["admin", "member"]);
    }

    #[test]
    fn get_roles_unknown_address() {
        let roles = vec![pair("alice", "admin")];
        assert!(get_roles_for_address(&roles, "unknown").is_empty());
    }
}
