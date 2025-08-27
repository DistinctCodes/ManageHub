import asyncio
import pytest

# NOTE:
# This is a minimal pytest skeleton that assumes you have a StarkNet testing fixture/environment.
# Adjust imports and deploy calls to match your toolchain (protostar / cairo-lang / scarb test harness).
#
# Example with cairo-lang's testing framework:
# from starkware.starknet.testing.starknet import Starknet
#
# The code below is illustrative. Replace deploy calls with your environment's deploy helper.

@pytest.mark.asyncio
async def test_register_and_verify_flow():
    # Replace with your test harness init (Starknet.empty() or fixture)
    from starkware.starknet.testing.starknet import Starknet
    starknet = await Starknet.empty()

    # deploy compiled contract path (adjust to your compiled artifact)
    contract = await starknet.deploy(
        source="contract/cairo1/src/user_management.cairo",
        constructor_calldata=[12345]  # owner address (felt)
    )

    owner = 12345
    user_addr = 222
    name = 555       # placeholder numeric name
    role = 0         # ROLE_USER
    biometric = 9999
    dept = 10
    emp_id = 42
    ts = 1000

    # register (owner is admin)
    await contract.register_user(user_addr, name, role, biometric, dept, emp_id, ts).invoke(caller_address=owner)

    # verify role and active
    (r,) = await contract.get_user_role(user_addr).call()
    assert r == role

    (active,) = await contract.is_user_active(user_addr).call()
    assert active == 1

    # successful biometric check
    (matched,) = await contract.verify_biometric(user_addr, biometric, ts + 1).call()
    assert matched == 1

    # failed biometric check increments failed_attempts and triggers alert after threshold
    bad = 123
    for i in range(FAILED_ATTEMPT_THRESHOLD):
        await contract.verify_biometric(user_addr, bad, ts + 2 + i).call()

    # deactivate (admin)
    await contract.deactivate_user(user_addr, ts + 100).invoke(caller_address=owner)
    (active,) = await contract.is_user_active(user_addr).call()
    assert active == 0

# End of test skeleton