use regex::Regex;

/// Validates whether a given string is a valid UUID v4 format.
///
/// UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
/// where y is one of [8, 9, a, b].
pub fn is_valid_token_id(token_id: &str) -> bool {
    let pattern = r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";
    let re = Regex::new(pattern).unwrap();
    re.is_match(token_id)
}

/// Checks if the claimed owner is the actual owner of a token in the registry.
///
/// The registry is a list of (token_id, owner_address) pairs.
/// Returns `true` only if the token_id exists in the registry AND the owner matches.
pub fn is_token_owner(token_id: &str, claimed_owner: &str, registry: &[(String, String)]) -> bool {
    registry
        .iter()
        .any(|(tid, owner)| tid == token_id && owner == claimed_owner)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ============ is_valid_token_id tests ============

    #[test]
    fn valid_uuid_v4() {
        assert!(is_valid_token_id("550e8400-e29b-41d4-a716-446655440000"));
    }

    #[test]
    fn valid_uuid_v4_variant_9() {
        assert!(is_valid_token_id("6ba7b810-9dad-41d2-9e18-7c3c9a0f1a2b"));
    }

    #[test]
    fn rejects_uuid_v1() {
        // UUID v1 has version digit '1' in the third group
        assert!(!is_valid_token_id("550e8400-e29b-11d4-a716-446655440000"));
    }

    #[test]
    fn rejects_uuid_v3() {
        // UUID v3 has version digit '3' in the third group
        assert!(!is_valid_token_id("550e8400-e29b-31d4-a716-446655440000"));
    }

    #[test]
    fn rejects_uuid_v5() {
        // UUID v5 has version digit '5' in the third group
        assert!(!is_valid_token_id("550e8400-e29b-51d4-a716-446655440000"));
    }

    #[test]
    fn rejects_malformed_string() {
        assert!(!is_valid_token_id("not-a-uuid"));
    }

    #[test]
    fn rejects_uppercase_uuid() {
        assert!(!is_valid_token_id("550E8400-E29B-41D4-A716-446655440000"));
    }

    #[test]
    fn rejects_invalid_variant_digit() {
        // Variant digit must be [89ab], using '7' here
        assert!(!is_valid_token_id("550e8400-e29b-41d4-7716-446655440000"));
    }

    // ============ is_token_owner tests ============

    #[test]
    fn owner_matches_in_registry() {
        let registry = vec![
            ("token-1".to_string(), "owner-a".to_string()),
            ("token-2".to_string(), "owner-b".to_string()),
        ];
        assert!(is_token_owner("token-1", "owner-a", &registry));
    }

    #[test]
    fn owner_does_not_match() {
        let registry = vec![
            ("token-1".to_string(), "owner-a".to_string()),
        ];
        assert!(!is_token_owner("token-1", "wrong-owner", &registry));
    }

    #[test]
    fn unregistered_token_id_returns_false() {
        let registry = vec![
            ("token-1".to_string(), "owner-a".to_string()),
        ];
        assert!(!is_token_owner("unknown-token", "owner-a", &registry));
    }

    #[test]
    fn empty_registry_returns_false() {
        let registry: Vec<(String, String)> = vec![];
        assert!(!is_token_owner("token-1", "owner-a", &registry));
    }
}
