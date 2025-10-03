# Membership Token Contract

A feature rich ERC20 compatible membership token smart contract for the ManageHub ecosystem built on Soroban (Stellar) with integrated Role Based Access Control (RBAC).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Token Specifications](#token-specifications)
- [Access Control Integration](#access-control-integration)
- [Contract Architecture](#contract-architecture)
- [Functions](#functions)
- [Cross-Contract Communication](#cross-contract-communication)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)

## Overview

The Membership Token contract provides a comprehensive token system for the ManageHub ecosystem with built-in access control integration. It follows ERC20 standards while leveraging Soroban's cross-contract capabilities to enforce role-based permissions for critical operations.

### Key Benefits

- ERC20 Compatibility: Standard token interface with transfer, approve, allowance
- Role-Based Security: Integrated with Access Control contract for permission management
- Protected Operations: Minting requires specific roles
- Cross-Contract Integration: Seamless communication with Access Control contract
- Event-Driven Transparency: All operations emit events for tracking
- Soroban Optimized: Built specifically for Stellar's smart contract platform

## Features

### Core Token Functionality

- Standard Operations: Transfer, approve, allowance, balance queries
- Minting: Create new tokens (restricted to Minter role)
- Owner-Only Transfers: Token holders can only transfer their own tokens
- Allowance System: Approve/transferFrom pattern for delegated transfers

### Access Control Features

- Role Verification: Checks permissions via cross-contract calls
- Minter Protection: Only addresses with "Minter" role can mint tokens
- Enhanced Security: Removed transferer role for improved security
- Dynamic Permissions: Role assignments managed by Access Control contract

## Token Specifications

### Token Properties

```rust
pub struct TokenInfo {
    pub name: String,        // Token name (e.g., "ManageHub Membership Token")
    pub symbol: String,      // Token symbol (e.g., "MHT")
    pub decimals: u32,       // Decimal places (e.g., 18)
    pub total_supply: i128,  // Total tokens in circulation
}
```

### Built-in Roles Integration

- Minter: Can create new tokens via `mint()` function
- Token Holders: Can transfer their own tokens (enhanced security model)

## Access Control Integration

### Cross-Contract Architecture

The Membership Token contract integrates with the Access Control contract through cross-contract calls to verify permissions before executing protected operations.

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   Membership Token      │◄────────┤    Access Control        │
│                         │         │                          │
│ • mint() checks Minter  │  calls  │ • check_access()         │
│ • transfer() owner-only │────────►│ • Role verification      │
│   (enhanced security)   │         │ • Permission management  │
└─────────────────────────┘         └──────────────────────────┘
```

### Integration Benefits

- **Single Source of Truth**: All permissions managed centrally
- **Consistent Security**: Same role definitions across ecosystem
- **Flexible Permissions**: Easy to modify roles without contract upgrades
- **Audit Trail**: Permission checks logged via events

## Contract Architecture

### Data Structures

```rust
#[contracttype]
pub enum DataKey {
    TokenInfo,                    // Stores token metadata
    Balance(Address),            // Maps address -> token balance
    Allowance(Address, Address), // Maps (owner, spender) -> allowance
    AccessControl,              // Stores Access Control contract address
}

#[contracterror]
pub enum Error {
    InsufficientBalance = 1,
    InsufficientAllowance = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    AccessControlNotSet = 5,
}
```

### Storage Pattern

- **Instance Storage**: Token metadata, contract addresses, balances, allowances
- **Persistent Storage**: Not used (all data in instance storage for this contract)
- **Access Control Reference**: Stores Access Control contract address for cross-contract calls

### Cross-Contract Interface

```rust
pub mod access_control_interface {
    #[contracttype]
    pub struct QueryMsg {
        pub check_access: CheckAccessQuery,
    }

    #[contracttype]
    pub struct CheckAccessQuery {
        pub caller: Address,
        pub required_role: String,
    }

    #[contracttype]
    pub struct AccessResponse {
        pub has_access: bool,
    }
}
```

## Functions

### Initialization

#### `initialize(env: Env, name: String, symbol: String, decimals: u32, access_control_contract: Address) -> Result<(), Error>`

Initializes the token contract with metadata and links to Access Control contract.

**Parameters:**

- `name`: Token name (e.g., "ManageHub Membership Token")
- `symbol`: Token symbol (e.g., "MHT")
- `decimals`: Number of decimal places
- `access_control_contract`: Address of the Access Control contract

**Sets up:**

- Token metadata
- Zero initial supply
- Access Control contract reference

---

### Protected Operations

#### `mint(env: Env, caller: Address, to: Address, amount: i128) -> Result<(), Error>`

Creates new tokens and assigns them to an address. **Requires Minter role**.

**Parameters:**

- `caller`: Address requesting the mint (must have Minter role)
- `to`: Address to receive the new tokens
- `amount`: Number of tokens to create

**Access Control:**

- Cross-contract call to verify caller has "Minter" role
- Authentication required via `caller.require_auth()`

**Effects:**

- Increases recipient's balance
- Increases total supply
- Emits mint event

---

#### `transfer(env: Env, caller: Address, from: Address, to: Address, amount: i128) -> Result<(), Error>`

Transfers tokens between addresses with role-based protection.

**Parameters:**

- `caller`: Address initiating the transfer
- `from`: Address sending tokens
- `to`: Address receiving tokens
- `amount`: Number of tokens to transfer

**Access Control:**

- If `caller == from`: No role check (owners can transfer their tokens)
- If `caller != from`: Requires "Transferer" role via cross-contract call
- Authentication required via `caller.require_auth()`

**Effects:**

- Decreases sender's balance
- Increases recipient's balance
- Emits transfer event

---

### Standard ERC20 Operations

#### `approve(env: Env, owner: Address, spender: Address, amount: i128) -> Result<(), Error>`

Approves a spender to transfer tokens on behalf of the owner.

#### `transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) -> Result<(), Error>`

Transfers tokens using allowance mechanism.

#### `balance_of(env: Env, account: Address) -> i128`

Returns the token balance of an account.

#### `allowance(env: Env, owner: Address, spender: Address) -> i128`

Returns the allowance granted by owner to spender.

#### `total_supply(env: Env) -> Result<i128, Error>`

Returns the total number of tokens in circulation.

#### `token_info(env: Env) -> Result<TokenInfo, Error>`

Returns complete token metadata.

## Cross-Contract Communication

### Permission Verification Process

The contract implements a sophisticated cross-contract communication system to verify permissions:

```rust
fn check_access(env: &Env, caller: &Address, required_role: &String) -> Result<(), Error> {
    // 1. Get Access Control contract address
    let access_control_contract: Address = env.storage().instance()
        .get(&DataKey::AccessControl)
        .ok_or(Error::AccessControlNotSet)?;

    // 2. Prepare query message
    let query = access_control_interface::QueryMsg {
        check_access: access_control_interface::CheckAccessQuery {
            caller: caller.clone(),
            required_role: required_role.clone(),
        },
    };

    // 3. Make cross-contract call
    let response: access_control_interface::AccessResponse = env
        .invoke_contract(
            &access_control_contract,
            &Symbol::new(env, "check_access"),
            Vec::from_array(env, [query.into_val(env)])
        );

    // 4. Process response
    if response.has_access {
        Ok(())
    } else {
        Err(Error::Unauthorized)
    }
}
```

### Integration Flow

1. **Contract Linking**: During initialization, store Access Control contract address
2. **Permission Check**: Before protected operations, call `check_access`
3. **Cross-Contract Call**: Use `env.invoke_contract` to query permissions
4. **Response Processing**: Allow or deny operation based on response
5. **Error Handling**: Return appropriate errors for failed checks

### Security Benefits

- **Real-time Verification**: Permissions checked on every operation
- **Centralized Management**: All roles managed in one contract
- **Consistent Enforcement**: Same permission logic across all operations
- **Audit Trail**: All permission checks create transaction records

## Usage Examples

### Basic Setup

```rust
// 1. Deploy both contracts
let access_control_id = env.register(AccessControl, ());
let token_id = env.register(MembershipToken, ());

let access_client = AccessControlClient::new(&env, &access_control_id);
let token_client = MembershipTokenClient::new(&env, &token_id);

// 2. Initialize Access Control
let admin = Address::generate(&env);
access_client.initialize(&admin);

// 3. Initialize Token with Access Control link
let token_name = String::from_str(&env, "ManageHub Membership Token");
let token_symbol = String::from_str(&env, "MHT");
token_client.initialize(&token_name, &token_symbol, &18, &access_control_id);
```

### Role Assignment and Token Operations

```rust
// 1. Set up minter role
let minter = Address::generate(&env);
let minter_role = String::from_str(&env, "Minter");
access_client.grant_role(&admin, &minter, &minter_role);

// 2. Mint tokens (requires Minter role)
let recipient = Address::generate(&env);
let mint_amount = 1000_i128 * 10_i128.pow(18); // 1000 tokens with 18 decimals
token_client.mint(&minter, &recipient, &mint_amount);

// 3. Owner can transfer their tokens (no role required)
let another_user = Address::generate(&env);
let transfer_amount = 100_i128 * 10_i128.pow(18);
token_client.transfer(&recipient, &recipient, &another_user, &transfer_amount);
```

### Protected Third-Party Transfers

```rust
// 1. Set up transferer role
let transferer = Address::generate(&env);
let transferer_role = String::from_str(&env, "Transferer");
access_client.grant_role(&admin, &transferer, &transferer_role);

// 2. Transferer can move tokens between any accounts
token_client.transfer(&transferer, &recipient, &another_user, &transfer_amount);

// 3. Without role, third-party transfer fails
let unauthorized_user = Address::generate(&env);
let result = token_client.try_transfer(&unauthorized_user, &recipient, &another_user, &transfer_amount);
assert!(result.is_err()); // Should fail with Unauthorized error
```

### Standard ERC20 Operations

```rust
// 1. Check balances
let balance = token_client.balance_of(&recipient);
println!("Balance: {}", balance);

// 2. Approve spending
let spender = Address::generate(&env);
let approval_amount = 50_i128 * 10_i128.pow(18);
token_client.approve(&recipient, &spender, &approval_amount);

// 3. Transfer from allowance
token_client.transfer_from(&spender, &recipient, &another_user, &25_i128 * 10_i128.pow(18));

// 4. Check remaining allowance
let remaining = token_client.allowance(&recipient, &spender);
assert_eq!(remaining, 25_i128 * 10_i128.pow(18));
```

## Testing

### Test Coverage

The contract includes comprehensive tests covering:

- **Initialization**: Contract setup and Access Control linking
- **Minting**: Role-based token creation
- **Transfers**: Owner transfers and role-based transfers
- **Access Control**: Permission verification and error handling
- **ERC20 Operations**: Standard token functionality
- **Error Cases**: All error conditions and edge cases

### Running Tests

```bash
# Run all tests
cargo test --lib -p membership_token

# Run specific test
cargo test --lib -p membership_token test_mint_with_role

# Run with output
cargo test --lib -p membership_token -- --nocapture
```

### Test Results

```
running 7 tests
test test::test_approve ... ok
test test::test_initialize ... ok
test test::test_mint_with_role ... ok
test test::test_standard_transfer ... ok
test test::test_total_supply ... ok
test test::test_transfer_from ... ok
test test::test_unauthorized_mint ... ok

test result: ok. 7 passed; 0 failed
```

### Key Test Scenarios

#### Access Control Integration Tests

```rust
#[test]
fn test_mint_with_role() {
    // Verifies that minting requires Minter role
    // Tests successful mint with proper role
    // Tests failed mint without role
}

#[test]
fn test_unauthorized_mint() {
    // Verifies that unauthorized users cannot mint
    // Tests error handling for missing roles
}
```

#### Token Functionality Tests

```rust
#[test]
fn test_standard_transfer() {
    // Tests owner-to-owner transfers (no role required)
    // Verifies balance updates and event emission
}

#[test]
fn test_transfer_from() {
    // Tests allowance-based transfers
    // Verifies allowance updates and balance changes
}
```

## Deployment

### Building for Production

```bash
# Build optimized WASM
cargo build --target wasm32-unknown-unknown --release -p membership_token

# Verify build
ls target/wasm32-unknown-unknown/release/membership_token.wasm
```

### Deployment Steps

1. **Deploy Access Control**: Deploy and initialize Access Control contract first
2. **Deploy Token Contract**: Deploy Membership Token contract
3. **Initialize Token**: Link to Access Control contract and set metadata
4. **Configure Roles**: Set up initial minters and transferers
5. **Test Integration**: Verify cross-contract communication works

### Example Deployment Script

```rust
// 1. Deploy and set up Access Control
let access_control_id = deploy_contract(env, AccessControl)?;
let access_client = AccessControlClient::new(env, &access_control_id);
access_client.initialize(&admin_address)?;

// 2. Deploy and initialize Token
let token_id = deploy_contract(env, MembershipToken)?;
let token_client = MembershipTokenClient::new(env, &token_id);

token_client.initialize(
    &String::from_str(env, "ManageHub Membership Token"),
    &String::from_str(env, "MHT"),
    &18,
    &access_control_id
)?;

// 3. Set up initial roles
access_client.grant_role(&admin_address, &minter_address, &String::from_str(env, "Minter"))?;
access_client.grant_role(&admin_address, &transferer_address, &String::from_str(env, "Transferer"))?;

// 4. Initial token distribution
token_client.mint(&minter_address, &initial_holder, &initial_supply)?;
```

## Security Considerations

### Access Control Security

- **Role Verification**: All protected operations verify permissions in real-time
- **Cross-Contract Security**: Relies on Access Control contract for permission truth
- **Authentication Required**: All state-changing operations require caller authentication
- **Error Handling**: Secure error messages without information leakage

### Token Security

- **Balance Protection**: Users can only spend tokens they own or have allowance for
- **Overflow Protection**: Uses Soroban's built-in i128 arithmetic with overflow checks
- **Allowance Safety**: Allowances properly updated to prevent double-spending
- **Transfer Validation**: All transfers validate amounts and balances

### Best Practices

1. **Secure Admin Keys**: Protect Access Control admin private keys
2. **Role Management**: Regularly audit role assignments
3. **Monitoring**: Monitor minting and large transfers
4. **Emergency Procedures**: Plan for role revocation in emergencies

### Potential Risks

- **Access Control Dependency**: Token security depends on Access Control contract
- **Cross-Contract Gas**: Permission checks consume additional fees
- **Role Centralization**: Admin compromise affects token operations
- **Contract Upgrades**: Token contract cannot be upgraded once deployed

### Mitigations

- **Access Control Audits**: Regular security audits of Access Control contract
- **Gas Optimization**: Efficient cross-contract calls to minimize fees
- **Multi-Sig Admin**: Consider multi-signature admin addresses
- **Emergency Stops**: Implement emergency pause functionality
- **Role Expiration**: Consider time-based role expiration

## Events

The contract emits events for transparency and monitoring:

```rust
// Token minted
env.events().publish((symbol_short!("mint"), to, amount), ());

// Token transferred
env.events().publish((symbol_short!("transfer"), from, to, amount), ());

// Approval granted
env.events().publish((symbol_short!("approve"), owner, spender, amount), ());
```

## Integration with Other Contracts

### ManageHub Ecosystem Integration

The Membership Token contract is designed to integrate seamlessly with other ManageHub contracts:

#### 1. **Access Control Integration**

- **Permission Verification**: Real-time role checking via cross-contract calls
- **Centralized Roles**: All permissions managed through Access Control contract
- **Consistent Security**: Same security model across all ecosystem contracts

#### 2. **Future Integrations**

- **DAO Governance**: Token holders could participate in governance decisions
- **Staking Contracts**: Membership tokens could be staked for rewards
- **Marketplace**: Tokens could be used for marketplace transactions
- **Service Access**: Token balance could determine service access levels

### Integration Benefits

- **Unified Ecosystem**: Consistent token and permission system
- **Composability**: Easy to integrate with new contracts
- **Scalability**: Add new features without modifying core contracts
- **Interoperability**: Standard interfaces for cross-contract communication

## Development

### Prerequisites

- Rust 1.70+
- Soroban CLI
- WASM target: `rustup target add wasm32-unknown-unknown`

### Local Development

```bash
# Clone repository
git clone <repository-url>
cd contracts/membership-token

# Run tests
cargo test

# Build contract
cargo build --target wasm32-unknown-unknown --release

# Format code
cargo fmt

# Lint code
cargo clippy
```

### Development Workflow

1. **Write Tests**: Test-driven development approach
2. **Implement Features**: Add new functionality
3. **Integration Testing**: Test with Access Control contract
4. **Build & Deploy**: Create WASM binary and deploy
5. **Monitor & Audit**: Track usage and security

---

## Support

For questions, issues, or contributions:

- **Repository**: [ManageHub Contracts](repository-url)
- **Documentation**: [Soroban Docs](https://soroban.stellar.org/)
- **Community**: [Stellar Discord](https://discord.gg/stellar)

---
