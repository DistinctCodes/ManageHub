#![cfg(test)]

//! Test contract to verify common types functionality

use crate::{AttendanceAction, MembershipStatus, SubscriptionPlan, UserRole};
use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, Symbol};

#[contract]
pub struct TestTypesContract;

#[contractimpl]
impl TestTypesContract {
    pub fn test_subscription(plan: SubscriptionPlan) -> SubscriptionPlan {
        plan
    }

    pub fn test_attendance(action: AttendanceAction) -> AttendanceAction {
        action
    }

    pub fn test_role(role: UserRole) -> UserRole {
        role
    }

    pub fn test_status(status: MembershipStatus) -> MembershipStatus {
        status
    }

    pub fn test_all_types(
        _env: Env,
        plan: SubscriptionPlan,
        action: AttendanceAction,
        role: UserRole,
        status: MembershipStatus,
    ) -> Symbol {
        let _subscription = plan;
        let _attendance = action;
        let _user_role = role;
        let _membership = status;
        Symbol::new(&_env, "success")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subscription_plan() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestTypesContract);
        let client = TestTypesContractClient::new(&env, &contract_id);

        assert_eq!(
            client.test_subscription(&SubscriptionPlan::Monthly),
            SubscriptionPlan::Monthly
        );
        assert_eq!(
            client.test_subscription(&SubscriptionPlan::Daily),
            SubscriptionPlan::Daily
        );
    }

    #[test]
    fn test_attendance() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestTypesContract);
        let client = TestTypesContractClient::new(&env, &contract_id);

        assert_eq!(
            client.test_attendance(&AttendanceAction::ClockIn),
            AttendanceAction::ClockIn
        );
    }

    #[test]
    fn test_role() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestTypesContract);
        let client = TestTypesContractClient::new(&env, &contract_id);

        assert_eq!(client.test_role(&UserRole::Admin), UserRole::Admin);
    }

    #[test]
    fn test_status() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestTypesContract);
        let client = TestTypesContractClient::new(&env, &contract_id);

        assert_eq!(
            client.test_status(&MembershipStatus::Active),
            MembershipStatus::Active
        );
        assert_eq!(
            client.test_status(&MembershipStatus::Revoked),
            MembershipStatus::Revoked
        );
    }

    #[test]
    fn test_all_types() {
        let env = Env::default();
        let contract_id = env.register_contract(None, TestTypesContract);
        let client = TestTypesContractClient::new(&env, &contract_id);

        let result = client.test_all_types(
            &SubscriptionPlan::PayPerUse,
            &AttendanceAction::ClockOut,
            &UserRole::Staff,
            &MembershipStatus::Active,
        );

        assert_eq!(result, Symbol::new(&env, "success"));
    }
}