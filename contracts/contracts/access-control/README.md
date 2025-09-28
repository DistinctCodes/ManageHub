# 🔐 Access Control Contract

A comprehensive Role-Based Access Control (RBAC) smart contract for the ManageHub ecosystem built on Soroban (Stellar).

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Role System](#role-system)
- [Contract Architecture](#contract-architecture)
- [Functions](#functions)
- [Integration with Other Contracts](#integration-with-other-contracts)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)

## 🌟 Overview

The Access Control contract provides a robust role-based permission system that allows administrators to manage user access across the entire ManageHub ecosystem. It serves as the central authority for verifying user permissions before critical operations in other contracts.

### Key Benefits:

- ✅ **Centralized Permission Management**
- ✅ **Hierarchical Role System**
- ✅ **Cross-Contract Integration**
- ✅ **Event-Driven Transparency**
- ✅ **Admin-Controlled Security**

## 🚀 Features

### Core Functionality

- **Role Creation**: Administrators can create custom roles
- **Role Assignment**: Grant roles to specific addresses
- **Role Revocation**: Remove roles from users
- **Access Verification**: Check if users have required roles
- **Admin Management**: Hierarchical admin system

### Built-in Roles

- **Admin**: Can create roles and manage user permissions
- **Minter**: Authorized to mint tokens in connected contracts
- **Transferer**: Can transfer tokens between accounts

## 🏗️ Role System

### Role Hierarchy

```
┌─────────────┐
│    Admin    │ ← Can manage all roles
└─────────────┘
       │
   ┌───▼───┐
   │ Roles │
   └───────┘
       │
   ┌───▼────────────────┐
   │ Minter│ Transferer │ ← Specific permissions
   └────────────────────┘
```

### Role Definitions

| Role           | Description          | Permissions                                         |
| -------------- | -------------------- | --------------------------------------------------- |
| **Admin**      | System Administrator | Create roles, grant/revoke roles, system management |
| **Minter**     | Token Issuer         | Mint new tokens in connected token contracts        |
| **Transferer** | Transfer Agent       | Transfer tokens between any accounts                |

## 🏛️ Contract Architecture

### Data Structures

```rust
#[contracttype]
pub enum DataKey {
    Admin,                    // Stores the admin address
    UserRoles(Address),       // Maps user -> list of roles
    RoleMembers(String),      // Maps role -> list of users
    RoleExists(String),       // Tracks if role exists
}

#[contracterror]
pub enum Error {
    Unauthorized = 1,
    RoleAlreadyExists = 2,
    RoleDoesNotExist = 3,
    UserAlreadyHasRole = 4,
    UserDoesNotHaveRole = 5,
    AdminRequired = 6,
}
```

### Storage Pattern

- **Persistent Storage**: Role assignments and membership data
- **Instance Storage**: Admin address and contract metadata
- **Efficient Lookups**: Optimized for both user-to-roles and role-to-users queries

## 📚 Functions

### Administrative Functions

#### `initialize(env: Env, admin: Address) -> Result<(), Error>`

Initializes the contract with an admin and creates default roles.

**Parameters:**

- `admin`: Address of the initial administrator

**Creates:**

- Admin role and assigns to provided address
- Default Minter and Transferer roles

---

#### `create_role(env: Env, admin: Address, role: String) -> Result<(), Error>`

Creates a new role in the system.

**Parameters:**

- `admin`: Admin address (requires admin authentication)
- `role`: Name of the new role to create

**Requirements:**

- Caller must be admin
- Role name must not already exist

---

#### `grant_role(env: Env, admin: Address, user: Address, role: String) -> Result<(), Error>`

Assigns a role to a user.

**Parameters:**

- `admin`: Admin address (requires admin authentication)
- `user`: Address to receive the role
- `role`: Role name to assign

**Requirements:**

- Caller must be admin
- Role must exist
- User must not already have the role

---

#### `revoke_role(env: Env, admin: Address, user: Address, role: String) -> Result<(), Error>`

Removes a role from a user.

**Parameters:**

- `admin`: Admin address (requires admin authentication)
- `user`: Address to remove role from
- `role`: Role name to remove

**Requirements:**

- Caller must be admin
- Role must exist
- User must currently have the role

### Query Functions

#### `check_access(env: Env, query: QueryMsg) -> AccessResponse`

**Primary integration function** - Verifies if a user has a specific role.

**Parameters:**

- `query`: Contains caller address and required role

**Returns:**

- `AccessResponse { has_access: bool }`

**Usage by other contracts:**

```rust
let query = QueryMsg {
    check_access: CheckAccessQuery {
        caller: user_address,
        required_role: String::from_str(&env, "Minter"),
    },
};
let response = access_control_client.check_access(&query);
```

---

#### `has_role(env: Env, user: Address, role: String) -> Result<bool, Error>`

Checks if a user has a specific role.

---

#### `get_user_roles(env: Env, user: Address) -> Vec<String>`

Returns all roles assigned to a user.

---

#### `get_role_members(env: Env, role: String) -> Result<Vec<Address>, Error>`

Returns all users who have a specific role.

---

#### `is_admin(env: Env, user: Address) -> bool`

Checks if a user has admin privileges.

## 🔗 Integration with Other Contracts

### Cross-Contract Communication

The Access Control contract is designed to be integrated with other contracts in the ManageHub ecosystem. Here's how it works:

#### 1. **Contract Linking**

Other contracts store the Access Control contract address during initialization:

```rust
// In other contract's initialize function
env.storage().instance().set(&DataKey::AccessControl, &access_control_contract);
```

#### 2. **Permission Verification**

Other contracts call `check_access` before sensitive operations:

```rust
// Example from Membership Token contract
fn check_access(env: &Env, caller: &Address, required_role: &String) -> Result<(), Error> {
    let access_control_contract: Address = env.storage().instance()
        .get(&DataKey::AccessControl)
        .ok_or(Error::AccessControlNotSet)?;

    let query = QueryMsg {
        check_access: CheckAccessQuery {
            caller: caller.clone(),
            required_role: required_role.clone(),
        },
    };

    let response: AccessResponse = env
        .invoke_contract(&access_control_contract, &Symbol::new(env, "check_access"),
                        Vec::from_array(env, [query.into_val(env)]));

    if response.has_access {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}
```

#### 3. **Protected Operations**

```rust
// Example: Protected minting in token contract
pub fn mint(env: Env, caller: Address, to: Address, amount: i128) -> Result<(), Error> {
    caller.require_auth();

    // Check if caller has minter role via cross-contract call
    Self::check_access(&env, &caller, &String::from_str(&env, "Minter"))?;

    // Proceed with minting...
}
```

### Integration Benefits

- **Single Source of Truth**: All permissions managed in one contract
- **Consistency**: Same role definitions across all contracts
- **Flexibility**: Easy to add new roles and permissions
- **Security**: Centralized security model

## 💡 Usage Examples

### Basic Setup

```rust
// 1. Deploy the contract
let contract_id = env.register(AccessControl, ());
let client = AccessControlClient::new(&env, &contract_id);

// 2. Initialize with admin
let admin = Address::from_str(&env, "GADMIN...");
client.initialize(&admin);

// 3. Create custom role
let custom_role = String::from_str(&env, "Manager");
client.create_role(&admin, &custom_role);

// 4. Grant role to user
let user = Address::from_str(&env, "GUSER...");
client.grant_role(&admin, &user, &custom_role);
```

### Permission Checking

```rust
// Check if user has role
let has_role = client.has_role(&user, &custom_role);
if has_role {
    // User has permission
    println!("User authorized");
} else {
    // User lacks permission
    println!("Access denied");
}
```

### Cross-Contract Integration

```rust
// In another contract
pub fn protected_function(env: Env, caller: Address) -> Result<(), Error> {
    // Verify caller has required role
    Self::check_access(&env, &caller, &String::from_str(&env, "Manager"))?;

    // Execute protected operation
    Ok(())
}
```

## 🧪 Testing

### Test Coverage

The contract includes comprehensive tests covering:

- **Initialization**: Contract setup and admin assignment
- **Role Management**: Create, grant, revoke operations
- **Access Control**: Permission verification
- **Error Handling**: All error conditions
- **Edge Cases**: Duplicate roles, non-existent roles, unauthorized access

### Running Tests

```bash
# Run all tests
cargo test --lib -p access_control

# Run specific test
cargo test --lib -p access_control test_grant_role

# Run with output
cargo test --lib -p access_control -- --nocapture
```

### Test Results

```
running 10 tests
test test::test_check_access ... ok
test test::test_create_role ... ok
test test::test_grant_role ... ok
test test::test_initialize ... ok
test test::test_multiple_roles ... ok
test test::test_revoke_role ... ok
test test::test_role_already_exists_error ... ok
test test::test_grant_nonexistent_role ... ok
test test::test_unauthorized_role_creation ... ok
test test::test_user_already_has_role_error ... ok

test result: ok. 10 passed; 0 failed
```

## 🚀 Deployment

### Building for Production

```bash
# Build optimized WASM
cargo build --target wasm32-unknown-unknown --release

# Generate schema
cargo run --bin schema
```

### Deployment Steps

1. **Compile Contract**: Build optimized WASM binary
2. **Deploy to Network**: Use Soroban CLI or SDK
3. **Initialize**: Call `initialize()` with admin address
4. **Configure Roles**: Create and assign initial roles
5. **Integration**: Connect to other contracts

### Example Deployment Script

```rust
// Deploy and initialize
let contract_id = deploy_contract(env, AccessControl)?;
let client = AccessControlClient::new(env, &contract_id);

// Initialize with admin
client.initialize(&admin_address)?;

// Set up default users
client.grant_role(&admin_address, &minter_address, &String::from_str(env, "Minter"))?;
client.grant_role(&admin_address, &transferer_address, &String::from_str(env, "Transferer"))?;
```

## 🛡️ Security Considerations

### Access Control Security

- **Admin Protection**: Only designated admins can modify roles
- **Authentication Required**: All admin functions require caller authentication
- **Role Verification**: Cross-contract calls verify permissions in real-time
- **Error Handling**: Secure error messages without information leakage

### Best Practices

1. **Admin Key Security**: Protect admin private keys
2. **Role Principle**: Grant minimum necessary permissions
3. **Regular Audits**: Monitor role assignments
4. **Emergency Procedures**: Plan for admin key rotation

### Potential Risks

- **Admin Compromise**: Admin key compromise affects entire system
- **Role Creep**: Users accumulating unnecessary permissions
- **Gas Costs**: Cross-contract calls consume additional fees

### Mitigations

- **Multi-Sig Admin**: Consider multi-signature admin addresses
- **Role Expiration**: Implement time-based role expiration
- **Audit Logs**: Monitor all role changes via events
- **Emergency Stops**: Implement emergency pause functionality

## 📝 Events

The contract emits events for transparency and monitoring:

```rust
// Role created
env.events().publish((symbol_short!("role_new"), role.clone()), ());

// Role granted
env.events().publish((symbol_short!("role_give"), user.clone(), role.clone()), ());

// Role revoked
env.events().publish((symbol_short!("role_take"), user.clone(), role.clone()), ());

// Contract initialized
env.events().publish((symbol_short!("init"), admin.clone()), ());
```

## 🔧 Development

### Prerequisites

- Rust 1.70+
- Soroban CLI
- WASM target: `rustup target add wasm32-unknown-unknown`

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd contracts/access-control

# Run tests
cargo test

# Build contract
cargo build --target wasm32-unknown-unknown --release

# Format code
cargo fmt

# Lint code
cargo clippy
```

---

## 📞 Support

For questions, issues, or contributions:

- **Repository**: [ManageHub Contracts](repository-url)
- **Documentation**: [Soroban Docs](https://soroban.stellar.org/)
- **Community**: [Stellar Discord](https://discord.gg/stellar)

---

**Built with ❤️ for the ManageHub ecosystem using Soroban smart contracts**
