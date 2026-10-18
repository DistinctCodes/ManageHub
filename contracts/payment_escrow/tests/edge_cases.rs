// Edge cases for the escrow contract (issue CT-52): every case asserts the
// call is rejected with a contract error, not silently accepted.

use payment_escrow::{Error, PaymentEscrowContract, PaymentEscrowContractClient};
use soroban_sdk::{
    testutils::{Address as _, MockAuth, MockAuthInvoke},
    Address, BytesN, Env, IntoVal,
};

struct Fixture {
    env: Env,
    contract_id: Address,
    payer: Address,
    beneficiary: Address,
}

fn fixture() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(PaymentEscrowContract, ());
    let payer = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    Fixture { env, contract_id, payer, beneficiary }
}

fn client(f: &Fixture) -> PaymentEscrowContractClient<'_> {
    PaymentEscrowContractClient::new(&f.env, &f.contract_id)
}

fn escrow_id(f: &Fixture, seed: u8) -> BytesN<32> {
    BytesN::from_array(&f.env, &[seed; 32])
}

#[test]
fn double_release_is_rejected() {
    let f = fixture();
    let c = client(&f);
    let id = escrow_id(&f, 1);
    c.create(&id, &f.payer, &f.beneficiary, &100);
    c.release(&id);
    assert!(matches!(c.try_release(&id), Err(Ok(_))));
}

#[test]
fn refund_after_release_is_rejected() {
    let f = fixture();
    let c = client(&f);
    let id = escrow_id(&f, 2);
    c.create(&id, &f.payer, &f.beneficiary, &100);
    c.release(&id);
    assert!(matches!(c.try_refund(&id), Err(Ok(_))));
}

#[test]
fn release_of_nonexistent_escrow_is_rejected() {
    let f = fixture();
    let c = client(&f);
    assert_eq!(c.try_release(&escrow_id(&f, 3)), Err(Ok(Error::NotFound)));
}

#[test]
fn refund_of_nonexistent_escrow_is_rejected() {
    let f = fixture();
    let c = client(&f);
    assert_eq!(c.try_refund(&escrow_id(&f, 4)), Err(Ok(Error::NotFound)));
}

#[test]
fn unauthorized_release_is_rejected() {
    let f = fixture();
    let c = client(&f);
    let id = escrow_id(&f, 5);
    c.create(&id, &f.payer, &f.beneficiary, &100);

    let stranger = Address::generate(&f.env);
    f.env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &f.contract_id,
            fn_name: "release",
            args: (id.clone(),).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    assert!(c.try_release(&id).is_err());
}

#[test]
fn unauthorized_refund_is_rejected() {
    let f = fixture();
    let c = client(&f);
    let id = escrow_id(&f, 6);
    c.create(&id, &f.payer, &f.beneficiary, &100);

    let stranger = Address::generate(&f.env);
    f.env.mock_auths(&[MockAuth {
        address: &stranger,
        invoke: &MockAuthInvoke {
            contract: &f.contract_id,
            fn_name: "refund",
            args: (id.clone(),).into_val(&f.env),
            sub_invokes: &[],
        },
    }]);
    assert!(c.try_refund(&id).is_err());
}
