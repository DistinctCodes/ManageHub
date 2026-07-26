# Access Control Contract

## Overview

The `access_control` contract provides a comprehensive Role-Based Access Control (RBAC) system for the ManageHub platform. It implements hierarchical role management (Admin > Member > Guest), multi-signature governance with configurable thresholds, admin transfer workflows, and blacklisting. Designed for cross-contract integration with subscription and membership token contracts.

## Architecture

```
src/
├── lib.rs                   — Contract entry points
├── access_control.rs        — Core RBAC implementation
├── types.rs                 — UserRole, MultiSigConfig, ProposalAction, etc.
├── errors.rs                — AccessControlError codes (100–133)
└── access_control_tests.rs  — Unit tests
```

### Role Hierarchy

```
Admin (Level 2)
  ├── Can assign/remove roles for all users
  ├── Can manage system configuration
  ├── Can pause/unpause the system
  └── Can transfer admin privileges

Member (Level 1)
  ├── Can access member-specific functions
  └── Requires membership token balance validation

Guest (Level 0)
  └── Default role with access to public functions only
```

### Multisig Governance

| Threshold Level | Use Case |
|-----------------|----------|
| `required_signatures` | Standard operations (role assignment) |
| `critical_threshold` | Critical operations (config updates, admin add/remove) |
| `emergency_threshold` | Emergency operations (force admin transfer, emergency pause) |

### Proposal Lifecycle

```
  Create Proposal ──► Approve/Reject ──► Execute (if threshold met)
        │                    │
        │                    └──► Cancel (by proposer)
        │
        └──► Expire (after expiry_duration)
```

## Functions

### Core RBAC

```rust
fn initialize(env: Env, admin: Address)
fn set_role(env: Env, admin: Address, user: Address, role: UserRole)
fn get_role(env: Env, user: Address) -> UserRole
fn check_access(env: Env, user: Address, required_role: UserRole) -> bool
fn require_access(env: Env, user: Address, required_role: UserRole)
fn is_admin(env: Env, user: Address) -> bool
fn remove_role(env: Env, admin: Address, user: Address)
```

### Configuration

```rust
fn update_config(env: Env, admin: Address, config: AccessControlConfig)
fn get_config(env: Env) -> AccessControlConfig
fn pause(env: Env, admin: Address)
fn unpause(env: Env, admin: Address)
```

### Blacklisting

```rust
fn blacklist_user(env: Env, admin: Address, user: Address)
fn unblacklist_user(env: Env, admin: Address, user: Address)
fn is_blacklisted(env: Env, user: Address) -> bool
```

### Admin Transfer

```rust
fn propose_admin_transfer(env: Env, current_admin: Address, new_admin: Address)
fn accept_admin_transfer(env: Env, new_admin: Address)
fn cancel_admin_transfer(env: Env, current_admin: Address)
```

### Multisig

```rust
fn initialize_multisig(env: Env, admins: Vec<Address>, required_signatures: u32)
fn create_proposal(env: Env, proposer: Address, action: ProposalAction) -> u64
fn approve_proposal(env: Env, approver: Address, proposal_id: u64)
fn reject_proposal(env: Env, rejecter: Address, proposal_id: u64)
fn cancel_proposal(env: Env, proposer: Address, proposal_id: u64)
fn get_proposal(env: Env, proposal_id: u64) -> Option<PendingProposal>
fn get_pending_proposals(env: Env) -> Vec<u64>
fn get_proposal_stats(env: Env) -> ProposalStats
fn cleanup_expired_proposals(env: Env) -> u32
fn is_emergency_mode(env: Env) -> bool
fn deactivate_emergency_mode(env: Env, caller: Address)
```

### Multisig Queries

```rust
fn is_multisig_enabled(env: Env) -> bool
fn get_multisig_admins(env: Env) -> Vec<Address>
fn get_multisig_threshold(env: Env) -> u32
```

## Proposal Actions

| Action | Type | Description |
|--------|------|-------------|
| `SetRole(Address, UserRole)` | Standard | Assign a role to a user |
| `UpdateConfig(AccessControlConfig)` | Critical | Update access control configuration |
| `AddAdmin(Address)` | Critical | Add a new admin |
| `RemoveAdmin(Address)` | Critical | Remove an admin |
| `Pause` | Critical | Pause the contract |
| `Unpause` | Standard | Unpause the contract |
| `TransferAdmin(Address)` | Critical | Transfer admin privileges |
| `UpdateMultisigConfig(MultiSigConfig)` | Critical | Update multisig thresholds |
| `EmergencyPause(String)` | Emergency | Emergency pause with reason |
| `BatchBlacklist(Vec<Address>)` | Critical | Blacklist multiple users |
| `ScheduleUpgrade(Address, u64)` | TimeLocked | Schedule a contract upgrade |
| `EmergencyAdminTransfer(Address)` | Emergency | Force admin transfer |

## Example Usage

```rust
// Initialize with RBAC
AccessControl::initialize(&env, admin.clone());

// Assign a role
AccessControl::set_role(&env, admin.clone(), user.clone(), UserRole::Member);

// Check access
let has_access = AccessControl::check_access(&env, user.clone(), UserRole::Member);

// Enforce access
AccessControl::require_access(&env, user, UserRole::Admin)?;

// Initialize multisig with 2-of-3 threshold
AccessControl::initialize_multisig(&env, admins, 2);

// Create a proposal
let proposal_id = AccessControl::create_proposal(
    &env,
    proposer.clone(),
    ProposalAction::SetRole(new_user, UserRole::Admin),
);

// Approve
AccessControl::approve_proposal(&env, approver, proposal_id);
```

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 100 | `Unauthorized` | Caller not authorized |
| 101 | `AdminRequired` | Admin privileges required |
| 103 | `InsufficientRole` | User role too low |
| 109 | `NotInitialized` | System not initialized |
| 115 | `ContractPaused` | Contract is paused |
| 116 | `MultisigNotEnabled` | Multisig not enabled |
| 117 | `InsufficientApprovals` | Not enough approvals for execution |
| 118 | `ProposalNotFound` | Proposal not found |
| 119 | `ProposalAlreadyExecuted` | Proposal already executed |
| 120 | `ProposalExpired` | Proposal has expired |
| 121 | `TimeLockActive` | Time-lock period not yet passed |
| 125 | `MaxProposalsReached` | Too many pending proposals |
| 130 | `CannotRemoveLastAdmin` | Cannot remove the last admin |
| 133 | `ProposalRejected` | Rejection threshold reached |

## Testing

```bash
cargo test -p access_control
```
