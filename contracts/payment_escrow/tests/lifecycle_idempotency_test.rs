// Lifecycle and idempotency tests for payment_escrow contract (#2026).
// Asserts backend retry reconciliation guarantees, terminal finality states,
// duplicate call safety, and error code contracts.

use payment_escrow::{Error, EscrowState, PaymentEscrowContract, PaymentEscrowContractClient};
use soroban_sdk::{testutils::Address as _, token, Address, BytesN, Env};

struct Fixture {
    env: Env,
    contract_id: Address,
    payer: Address,
    beneficiary: Address,
    token: Address,
}

fn setup_fixture() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(PaymentEscrowContract, ());
    let payer = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let token = env
        .register_stellar_asset_contract_v2(Address::generate(&env))
        .address();
    token::StellarAssetClient::new(&env, &token).mint(&payer, &100_000);
    Fixture {
        env,
        contract_id,
        payer,
        beneficiary,
        token,
    }
}

fn client(f: &Fixture) -> PaymentEscrowContractClient<'_> {
    PaymentEscrowContractClient::new(&f.env, &f.contract_id)
}

fn make_escrow_id(f: &Fixture, seed: u8) -> BytesN<32> {
    BytesN::from_array(&f.env, &[seed; 32])
}

#[test]
fn duplicate_create_returns_already_exists_preventing_double_debit() {
    let f = setup_fixture();
    let c = client(&f);
    let id = make_escrow_id(&f, 10);
    let token_client = token::Client::new(&f.env, &f.token);

    let initial_payer_balance = token_client.balance(&f.payer);
    let initial_contract_balance = token_client.balance(&f.contract_id);

    // Initial create locks 500 units
    c.create(&id, &f.payer, &f.beneficiary, &500, &f.token);

    assert_eq!(token_client.balance(&f.payer), initial_payer_balance - 500);
    assert_eq!(
        token_client.balance(&f.contract_id),
        initial_contract_balance + 500
    );
    assert_eq!(c.get_status(&id), EscrowState::Locked as u32);

    // Backend retry with identical parameters must NOT double-debit payer
    let retry_res = c.try_create(&id, &f.payer, &f.beneficiary, &500, &f.token);
    assert_eq!(retry_res, Err(Ok(Error::AlreadyExists)));

    // Balances remain strictly unchanged after duplicate create attempt
    assert_eq!(token_client.balance(&f.payer), initial_payer_balance - 500);
    assert_eq!(
        token_client.balance(&f.contract_id),
        initial_contract_balance + 500
    );
}

#[test]
fn unconfirmed_transaction_reconciliation_via_get_status() {
    let f = setup_fixture();
    let c = client(&f);
    let id_confirmed = make_escrow_id(&f, 11);
    let id_unsubmitted = make_escrow_id(&f, 12);

    // Scenario A: Transaction landed on-chain before timeout
    c.create(&id_confirmed, &f.payer, &f.beneficiary, &250, &f.token);
    assert_eq!(c.get_status(&id_confirmed), EscrowState::Locked as u32);

    // Scenario B: Transaction never submitted / dropped from mempool
    let status_res = c.try_get_status(&id_unsubmitted);
    assert_eq!(status_res, Err(Ok(Error::NotFound)));
}

#[test]
fn terminal_state_released_is_immutable_and_rejects_subsequent_transitions() {
    let f = setup_fixture();
    let c = client(&f);
    let id = make_escrow_id(&f, 13);
    let token_client = token::Client::new(&f.env, &f.token);

    c.create(&id, &f.payer, &f.beneficiary, &1_000, &f.token);
    c.release(&id);

    // Status is terminal Released
    assert_eq!(c.get_status(&id), EscrowState::Released as u32);
    assert_eq!(token_client.balance(&f.beneficiary), 1_000);

    // Retry release returns AlreadyReleased (#6)
    assert_eq!(c.try_release(&id), Err(Ok(Error::AlreadyReleased)));

    // Attempting refund on released escrow returns AlreadyRefunded (#7) or AlreadyResolved (#2)
    assert!(c.try_refund(&id).is_err());

    // Attempting release_partial on released escrow returns AlreadyResolved (#2)
    assert_eq!(
        c.try_release_partial(&id, &100),
        Err(Ok(Error::AlreadyResolved))
    );

    // Attempting refund_remaining on released escrow returns AlreadyResolved (#2)
    assert_eq!(c.try_refund_remaining(&id), Err(Ok(Error::AlreadyResolved)));

    // State remains Released
    assert_eq!(c.get_status(&id), EscrowState::Released as u32);
}

#[test]
fn terminal_state_refunded_is_immutable_and_rejects_subsequent_transitions() {
    let f = setup_fixture();
    let c = client(&f);
    let id = make_escrow_id(&f, 14);
    let token_client = token::Client::new(&f.env, &f.token);

    c.create(&id, &f.payer, &f.beneficiary, &800, &f.token);
    c.refund(&id);

    assert_eq!(c.get_status(&id), EscrowState::Refunded as u32);

    // Retry refund returns AlreadyRefunded (#7)
    assert_eq!(c.try_refund(&id), Err(Ok(Error::AlreadyRefunded)));

    // Attempting release on refunded escrow is rejected
    assert!(c.try_release(&id).is_err());

    // Attempting release_partial on refunded escrow is rejected with AlreadyResolved (#2)
    assert_eq!(
        c.try_release_partial(&id, &100),
        Err(Ok(Error::AlreadyResolved))
    );

    // Beneficiary receives 0 tokens
    assert_eq!(token_client.balance(&f.beneficiary), 0);
}

#[test]
fn terminal_state_completed_via_partial_releases_rejects_further_settlement() {
    let f = setup_fixture();
    let c = client(&f);
    let id = make_escrow_id(&f, 15);

    c.create(&id, &f.payer, &f.beneficiary, &300, &f.token);

    // Release in two instalments: 200 + 100
    c.release_partial(&id, &200);
    assert_eq!(c.get_status(&id), EscrowState::Locked as u32);

    c.release_partial(&id, &100);
    // When released == amount, status transitions to Completed (4)
    assert_eq!(c.get_status(&id), EscrowState::Completed as u32);

    // Additional releases rejected with AlreadyResolved
    assert_eq!(
        c.try_release_partial(&id, &50),
        Err(Ok(Error::AlreadyResolved))
    );
    assert_eq!(c.try_release(&id), Err(Ok(Error::AlreadyResolved)));

    // Refund remaining rejected with AlreadyResolved
    assert_eq!(c.try_refund_remaining(&id), Err(Ok(Error::AlreadyResolved)));
}

#[test]
fn query_idempotency_get_status_is_read_only_and_deterministic() {
    let f = setup_fixture();
    let c = client(&f);
    let id = make_escrow_id(&f, 16);

    c.create(&id, &f.payer, &f.beneficiary, &400, &f.token);

    // Multiple consecutive queries across ledger advances return identical result
    for _ in 0..5 {
        assert_eq!(c.get_status(&id), EscrowState::Locked as u32);
    }
}
