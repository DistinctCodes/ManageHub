extern crate std;

use crate::ResourceCreditsContract;
use crate::ResourceCreditsContractClient;
use proptest::prelude::*;
use soroban_sdk::{
    testutils::Address as _,
    Address, Env,
};

fn setup_test() -> (Env, Address, ResourceCreditsContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(ResourceCreditsContract, ());
    let client = ResourceCreditsContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    env.mock_all_auths();
    client.initialize(&admin, &token);
    (env, admin, client)
}

proptest! {
    #[test]
    fn spend_never_results_in_negative_balance(
        mint_amount in 1_000u128..1_000_000u128,
        spend_amount in 1u128..2_000_000u128,
    ) {
        let (env, admin, client) = setup_test();
        let user = Address::generate(&env);

        let mint_result = client.try_mint_credits(&admin, &user, &mint_amount);
        if mint_result.is_err() {
            return Ok(());
        }

        let spend_result = client.try_spend_credits(&user, &spend_amount);

        let balance = client.balance(&user);

        if spend_amount > mint_amount {
            prop_assert!(
                spend_result.is_err(),
                "Spend should fail: amount {} > balance {}",
                spend_amount, mint_amount,
            );
            prop_assert_eq!(balance, mint_amount, "Balance must not change on failed spend");
        } else {
            prop_assert!(spend_result.is_ok());
            prop_assert_eq!(balance, mint_amount - spend_amount);
        }
    }

    #[test]
    fn sum_of_credits_equals_minted_minus_spent(
        mint_amounts in proptest::collection::vec(100u128..100_000u128, 1..5),
        spend_fractions in proptest::collection::vec(0u128..100u128, 1..5),
    ) {
        let (env, admin, client) = setup_test();
        let mut users = std::vec::Vec::new();
        let mut total_minted: u128 = 0;
        let mut total_spent: u128 = 0;

        for (i, &amount) in mint_amounts.iter().enumerate() {
            let user = Address::generate(&env);
            let _ = client.try_mint_credits(&admin, &user, &amount);
            total_minted += amount;

            let fraction = spend_fractions.get(i % spend_fractions.len()).copied().unwrap_or(0);
            let spend_amount = (amount * fraction) / 100;
            if spend_amount > 0 {
                let _ = client.try_spend_credits(&user, &spend_amount);
                total_spent += spend_amount;
            }
            users.push(user);
        }

        let mut total_user_balances: u128 = 0;
        for user in &users {
            total_user_balances += client.balance(user);
        }

        prop_assert_eq!(
            total_user_balances,
            total_minted - total_spent,
            "Sum of user balances ({}) != total minted ({}) - total spent ({})",
            total_user_balances, total_minted, total_spent,
        );
    }

    #[test]
    fn transfer_preserves_total_supply(
        supply in 1_000u128..1_000_000u128,
        transfer_amount in 1u128..500_000u128,
    ) {
        let (env, admin, client) = setup_test();
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);

        let mint_result = client.try_mint_credits(&admin, &sender, &supply);
        if mint_result.is_err() {
            return Ok(());
        }

        let initial_supply = client.total_supply();
        prop_assert_eq!(initial_supply, supply);

        let transfer_result = client.try_transfer_credits(&sender, &recipient, &transfer_amount);

        let final_supply = client.total_supply();

        if transfer_amount > supply {
            prop_assert!(
                transfer_result.is_err(),
                "Transfer should fail: amount {} > balance {}",
                transfer_amount, supply,
            );
            prop_assert_eq!(final_supply, supply, "Supply must not change on failed transfer");
        } else {
            prop_assert!(transfer_result.is_ok());
            prop_assert_eq!(final_supply, supply, "Transfer must preserve total supply");

            let sender_balance = client.balance(&sender);
            let recipient_balance = client.balance(&recipient);
            prop_assert_eq!(
                sender_balance + recipient_balance,
                supply,
                "Balances must sum to supply after transfer",
            );
        }
    }
}
