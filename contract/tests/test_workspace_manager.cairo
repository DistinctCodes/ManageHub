# WorkspaceManager Contract Tests
# Test basic admin, workspace, and user role management

from starkware.starknet.testing.starknet import Starknet
import asyncio
import pytest

OWNER = 0x1
ADMIN = 0x2
USER = 0x3
USER2 = 0x4

@pytest.mark.asyncio
async def test_workspace_manager():
    starknet = await Starknet.empty()
    contract = await starknet.deploy(
        source="src/WorkspaceManager.cairo",
        constructor_calldata=[OWNER]
    )

    # Only owner can add admin
    await contract.add_admin(ADMIN).invoke(caller_address=OWNER)
    res = await contract.admins(ADMIN).call()
    assert res.result.is_admin == 1

    # Only owner can remove admin
    await contract.remove_admin(ADMIN).invoke(caller_address=OWNER)
    res = await contract.admins(ADMIN).call()
    assert res.result.is_admin == 0

    # Add admin again for further tests
    await contract.add_admin(ADMIN).invoke(caller_address=OWNER)

    # Admin creates workspace
    tx = await contract.create_workspace(12345, 5).invoke(caller_address=ADMIN)
    workspace_id = tx.result.workspace_id
    info = await contract.get_workspace_info(workspace_id).call()
    assert info.result.name == 12345
    assert info.result.capacity == 5
    assert info.result.occupancy == 0

    # Admin updates workspace name
    await contract.update_workspace_name(workspace_id, 54321).invoke(caller_address=ADMIN)
    info = await contract.get_workspace_info(workspace_id).call()
    assert info.result.name == 54321

    # Admin updates capacity
    await contract.update_workspace_capacity(workspace_id, 10).invoke(caller_address=ADMIN)
    info = await contract.get_workspace_info(workspace_id).call()
    assert info.result.capacity == 10

    # Admin deactivates and activates workspace
    await contract.deactivate_workspace(workspace_id).invoke(caller_address=ADMIN)
    # Try to assign user to inactive workspace (should fail)
    with pytest.raises(Exception):
        await contract.assign_user_to_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    await contract.activate_workspace(workspace_id).invoke(caller_address=ADMIN)

    # Admin assigns user to workspace
    await contract.assign_user_to_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    assigned = await contract.is_user_in_workspace(workspace_id, USER).call()
    assert assigned.result.assigned == 1

    # Admin sets user role
    await contract.set_user_role(workspace_id, USER, 2).invoke(caller_address=ADMIN)
    role = await contract.get_user_role(workspace_id, USER).call()
    assert role.result.role == 2

    # Admin removes user from workspace
    await contract.remove_user_from_workspace(workspace_id, USER).invoke(caller_address=ADMIN)
    assigned = await contract.is_user_in_workspace(workspace_id, USER).call()
    assert assigned.result.assigned == 0
