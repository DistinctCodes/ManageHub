# ManageHub Contract

A Stellar Soroban smart contract providing the foundational infrastructure for a decentralized project management platform with integrated payment systems.

## Overview

ManageHub establishes secure admin management and contract initialization patterns that serve as the base for project management, task tracking, and payment processing on the Stellar network. This contract handles administrative controls while laying groundwork for USDC payments and activity logging.

## Project Structure

```
managehub_contract/
├── Cargo.toml                 # Dependencies and build configuration
├── README.md                  # This file
├── src/
│   └── lib.rs                 # Core contract implementation
└── tests/
    └── test_managehub.rs      # Integration tests
```

## Prerequisites

Install these tools before building:

```bash
# Install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WebAssembly target
rustup target add wasm32-unknown-unknown
```

## Setup Instructions

### 1. Clone and Navigate
```bash
cd managehub_contract
```

### 2. Verify Installation
```bash
cargo check
```

### 3. Build the Contract
```bash
# Development build
cargo build

# Optimized WASM build for deployment
cargo build --target wasm32-unknown-unknown --release
```

### 4. Run Tests
```bash
# Run all tests
cargo test

# Run with detailed output
cargo test -- --nocapture

# Run specific test
cargo test test_initialize
```

The compiled WASM file will be located at:
`target/wasm32-unknown-unknown/release/managehub_contract.wasm`

## Contract Functions

### Core Functions

**`initialize(admin: Address)`**
- One-time initialization with admin address
- Requires admin authorization
- Panics if already initialized

**`get_admin() -> Address`**
- Returns current admin address
- Panics if contract not initialized

**`is_initialized() -> bool`**
- Checks initialization status
- Returns true if admin is set

**`update_admin(new_admin: Address)`**
- Transfers admin rights
- Requires both current and new admin authorization

## Stellar Integration

### USDC Payment Integration

The contract architecture supports USDC payment processing through Stellar's native token operations:

**Planned Payment Features:**
- Direct USDC transfers for project funding
- Milestone-based payment releases
- Multi-signature payment approvals
- Automatic fee distribution
- Payment escrow functionality

**Integration Pattern:**
```rust
// Future implementation
pub fn process_payment(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
    usdc_token: Address
) {
    // USDC transfer logic using Stellar token contract
    // Payment verification and logging
    // Event emission for tracking
}
```

### Transaction Logging

All contract operations are automatically logged on the Stellar ledger:

**What Gets Logged:**
- Contract initialization events
- Admin transfers
- Payment transactions (when implemented)
- Access control changes

**Accessing Logs:**
```bash
# View contract events (requires Soroban CLI)
soroban events --id <CONTRACT_ID> --start-ledger <NUMBER>
```

**Log Benefits:**
- Immutable audit trail
- Transparent operations
- Compliance tracking
- Real-time monitoring capability

### Network Deployment

**Testnet Deployment:**
```bash
# Build optimized WASM
cargo build --target wasm32-unknown-unknown --release

# Deploy to Stellar testnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/managehub_contract.wasm \
  --source <YOUR_SECRET_KEY> \
  --network testnet

# Initialize after deployment
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source <YOUR_SECRET_KEY> \
  --network testnet \
  -- initialize --admin <ADMIN_ADDRESS>
```

**Mainnet Considerations:**
- Thoroughly test on testnet first
- Audit contract before mainnet deployment
- Ensure proper key management
- Monitor contract after deployment

## Extending the Contract

The `DataKey` enum is designed for modular expansion:

```rust
pub enum DataKey {
    Admin,
    // Add new storage keys here:
    // Projects,    // Project registry
    // Users,       // User management
    // Payments,    // Payment tracking
    // Tasks,       // Task assignments
}
```

### Adding New Modules

1. Add new variant to `DataKey` enum
2. Implement functions in `ManageHubContract`
3. Add corresponding tests
4. Update README with new features

## Testing

The project includes comprehensive test coverage:

- **Integration Tests:** `tests/test_managehub.rs`
  - Contract initialization
  - Admin verification
  - Double initialization prevention
  - Uninitialized state handling

Run specific test suites:
```bash
# Only integration tests
cargo test --test test_managehub

# Run with backtrace for debugging
RUST_BACKTRACE=1 cargo test
```

## Development Workflow

```bash
# Format code
cargo fmt

# Check for issues
cargo clippy

# Run tests
cargo test

# Build for deployment
cargo build --target wasm32-unknown-unknown --release
```

## Common Issues

**"no contract running" error:**
- Ensure you're using the contract client pattern in tests
- Call `env.register_contract()` before creating client

**Authorization errors:**
- Call `env.mock_all_auths()` in tests before contract operations
- In production, ensure proper signature verification

**Build failures:**
- Verify `wasm32-unknown-unknown` target is installed
- Check Rust version compatibility (requires 1.70+)

## Future Roadmap

- [ ] Project creation and management
- [ ] User role-based permissions
- [ ] Task assignment system
- [ ] USDC payment integration
- [ ] Milestone tracking
- [ ] Invoice generation
- [ ] Multi-signature support
- [ ] Analytics dashboard integration

## Resources

- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar Developer Docs](https://developers.stellar.org/)
- [Soroban SDK Reference](https://docs.rs/soroban-sdk/)
- [Stellar USDC Integration](https://developers.stellar.org/docs/tokens/usdc)

## License

MIT License - See LICENSE file for details