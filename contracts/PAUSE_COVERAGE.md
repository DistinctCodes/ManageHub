# Emergency Pause Coverage Audit

This document audits every state-changing entrypoint across all ManageHub contracts
for emergency pause support. A pause check ensures that critical operations are
blocked when the contract is in an emergency-paused state.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Pause check present |
| ❌ | Missing pause check |
| N/A | Read-only / admin-pause itself (no check needed) |

---

## manage_hub Contract

The manage_hub contract uses `PauseGuard::require_not_paused()` from `guards.rs`
to enforce global pause state. Per-token pauses use `PauseGuard::require_token_not_paused()`.

| Entrypoint | Pause Check | Notes |
|-----------|-------------|-------|
| `hello` | N/A | No state change |
| `batch_mint` | ✅ | Delegates to `MembershipTokenContract::batch_issue_tokens` |
| `batch_transfer` | ✅ | Delegates to `MembershipTokenContract::batch_transfer_tokens` |
| `batch_update` | ✅ | Delegates to `MembershipTokenContract::batch_set_token_metadata` |
| `issue_token` | ✅ | `PauseGuard::require_not_paused` in membership_token.rs |
| `transfer_token` | ✅ | `PauseGuard::require_not_paused` + per-token pause |
| `transfer_token_with_royalty` | ✅ | Calls transfer_token which checks pause |
| `set_royalty` | ❌ | **Missing** — should check pause |
| `approve` | ✅ | `PauseGuard::require_not_paused` + per-token |
| `transfer_from` | ✅ | `PauseGuard::require_not_paused` + per-token |
| `revoke_allowance` | ✅ | `PauseGuard::require_not_paused` + per-token |
| `fractionalize_token` | ❌ | **Missing** — should check pause |
| `transfer_fraction` | ❌ | **Missing** — should check pause |
| `recombine_fractions` | ❌ | **Missing** — should check pause |
| `distribute_fraction_rewards` | ❌ | **Missing** — should check pause |
| `set_admin` | N/A | Admin-only; bypasses pause by design |
| `log_attendance` | ❌ | **Missing** — state-changing, should check pause |
| `create_subscription` | ❌ | **Missing** — should check pause |
| `renew_subscription` | ❌ | **Missing** — should check pause |
| `cancel_subscription` | ❌ | **Missing** — should check pause |
| `pause_subscription` | N/A | Subscription pause management |
| `resume_subscription` | N/A | Subscription resume management |
| `pause_subscription_admin` | N/A | Admin action |
| `resume_subscription_admin` | N/A | Admin action |
| `set_pause_config` | N/A | Admin configuration |
| `set_usdc_contract` | N/A | Admin configuration |
| `create_tier` | N/A | Admin configuration |
| `update_tier` | N/A | Admin configuration |
| `deactivate_tier` | N/A | Admin configuration |
| `create_subscription_with_tier` | ❌ | **Missing** — should check pause |
| `request_tier_change` | ❌ | **Missing** — should check pause |
| `process_tier_change` | ❌ | **Missing** — should check pause |
| `cancel_tier_change` | ❌ | **Missing** — should check pause |
| `create_promotion` | N/A | Admin configuration |
| `set_token_metadata` | ❌ | **Missing** — should check pause |
| `update_token_metadata` | ❌ | **Missing** — should check pause |
| `remove_metadata_attributes` | ❌ | **Missing** — should check pause |
| `set_renewal_config` | N/A | Admin configuration |
| `renew_token` | ✅ | `PauseGuard::require_not_paused` + per-token |
| `set_auto_renewal` | ❌ | **Missing** — should check pause |
| `set_staking_config` | N/A | Admin configuration |
| `create_staking_tier` | N/A | Admin configuration |
| `stake_tokens` | ❌ | **Missing** — should check pause |
| `unstake_tokens` | ❌ | **Missing** — should check pause |
| `emergency_unstake` | ❌ | **Missing** — should check pause (emergency but state-changing) |
| `emergency_pause` | N/A | Pause control |
| `emergency_unpause` | N/A | Pause control |
| `set_upgrade_config` | N/A | Admin configuration |
| `upgrade_token` | ❌ | **Missing** — should check pause |
| `batch_upgrade_tokens` | ❌ | **Missing** — should check pause |
| `rollback_token_upgrade` | ❌ | **Missing** — should check pause |

### Summary for manage_hub

- **Checked**: 8 entrypoints
- **Missing**: 18 entrypoints
- **N/A (admin/config)**: 14 entrypoints

---

## workspace_booking Contract

The workspace_booking contract does **not** currently have any pause mechanism.

| Entrypoint | Pause Check | Notes |
|-----------|-------------|-------|
| `initialize` | N/A | One-time setup |
| `register_workspace` | ❌ | **Missing** — admin state change |
| `set_workspace_availability` | ❌ | **Missing** — admin state change |
| `set_workspace_rate` | ❌ | **Missing** — admin state change |
| `book_workspace` | ❌ | **Missing** — member action, state-changing |
| `cancel_booking` | ❌ | **Missing** — member/admin action, state-changing |
| `complete_booking` | ❌ | **Missing** — admin action, state-changing |
| `get_workspace` | N/A | Read-only |
| `get_booking` | N/A | Read-only |
| `get_all_workspaces` | N/A | Read-only |
| `get_member_bookings` | N/A | Read-only |
| `get_workspace_bookings` | N/A | Read-only |
| `check_availability` | N/A | Read-only |

### Summary for workspace_booking

- **Checked**: 0 entrypoints
- **Missing**: 6 entrypoints (all state-changing)
- **N/A**: 7 entrypoints (read-only + init)

---

## payment_escrow Contract

The payment_escrow contract does **not** currently have any pause mechanism.

| Entrypoint | Pause Check | Notes |
|-----------|-------------|-------|
| `initialize` | N/A | One-time setup |
| `set_dispute_window` | ❌ | **Missing** — admin config |
| `create_escrow` | ❌ | **Missing** — depositor action |
| `release` | ❌ | **Missing** — admin action |
| `refund` | ❌ | **Missing** — admin action |
| `raise_dispute` | ❌ | **Missing** — depositor action |
| `resolve_dispute` | ❌ | **Missing** — admin action |
| `claim` | ❌ | **Missing** — beneficiary action |
| `get_escrow` | N/A | Read-only |
| `get_depositor_escrows` | N/A | Read-only |
| `get_beneficiary_escrows` | N/A | Read-only |
| `admin` | N/A | Read-only |
| `payment_token` | N/A | Read-only |
| `dispute_window` | N/A | Read-only |

### Summary for payment_escrow

- **Checked**: 0 entrypoints
- **Missing**: 7 entrypoints (all state-changing)
- **N/A**: 7 entrypoints (read-only + init)

---

## resource_credits Contract

The resource_credits contract does **not** currently have any pause mechanism.

| Entrypoint | Pause Check | Notes |
|-----------|-------------|-------|
| `initialize` | N/A | One-time setup |
| `mint_credits` | ❌ | **Missing** — admin action |
| `transfer_credits` | ❌ | **Missing** — member action |
| `spend_credits` | ❌ | **Missing** — member action |
| `balance` | N/A | Read-only |
| `total_supply` | N/A | Read-only |

### Summary for resource_credits

- **Checked**: 0 entrypoints
- **Missing**: 3 entrypoints (all state-changing)
- **N/A**: 3 entrypoints (read-only + init)

---

## access_control Contract

The access_control contract has its own built-in pause mechanism via
`AccessControlModule::is_paused()` / `require_not_paused()`.

| Entrypoint | Pause Check | Notes |
|-----------|-------------|-------|
| `initialize` | N/A | One-time setup |
| `initialize_multisig` | N/A | One-time setup |
| `set_role` | ✅ | `require_not_paused` |
| `check_access` | ✅ | `require_not_paused` |
| `require_access` | ✅ | Delegates to check_access |
| `update_config` | ❌ | **Missing** — admin action |
| `pause` | N/A | Pause control |
| `unpause` | N/A | Pause control |
| `blacklist_user` | ❌ | **Missing** — admin action |
| `unblacklist_user` | ❌ | **Missing** — admin action |
| `propose_admin_transfer` | ❌ | **Missing** — admin action |
| `accept_admin_transfer` | ❌ | **Missing** — should verify |
| `cancel_admin_transfer` | ❌ | **Missing** — admin action |
| `remove_role` | ❌ | **Missing** — admin action |
| `create_proposal` | ❌ | **Missing** — admin action |
| `approve_proposal` | ❌ | **Missing** — admin action |
| `reject_proposal` | ❌ | **Missing** — admin action |
| `cancel_proposal` | ❌ | **Missing** — proposer action |
| `execute_proposal` | ❌ | **Missing** — multisig execution |
| `set_user_tier` | ❌ | **Missing** — admin action |
| `set_required_tier_for_role` | ❌ | **Missing** — admin action |
| `deactivate_emergency_mode` | N/A | Emergency mode control |

### Summary for access_control

- **Checked**: 2 entrypoints
- **Missing**: 13 entrypoints
- **N/A**: 4 entrypoints

---

## Recommendations

### High Priority (Critical operations)

1. **manage_hub**: Add `PauseGuard::require_not_paused` to:
   - `create_subscription`, `renew_subscription`, `cancel_subscription`
   - `stake_tokens`, `unstake_tokens`, `emergency_unstake`
   - `create_subscription_with_tier`, `request_tier_change`, `process_tier_change`
   - `upgrade_token`, `batch_upgrade_tokens`, `rollback_token_upgrade`

2. **workspace_booking**: Add a pause mechanism (similar to access_control's)
   and check it in all state-changing entrypoints.

3. **payment_escrow**: Add a pause mechanism and check it in:
   - `create_escrow`, `release`, `refund`, `raise_dispute`, `resolve_dispute`, `claim`

4. **resource_credits**: Add a pause mechanism and check it in:
   - `mint_credits`, `transfer_credits`, `spend_credits`

### Medium Priority

5. **manage_hub**: Add pause checks to fractionalization, metadata, and staking operations.
6. **access_control**: Add pause checks to admin operations that modify state.
