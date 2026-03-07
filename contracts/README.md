# Soroban Project

## Prerequisites

Before building and deploying Soroban contracts, ensure you have the following installed:

### Rust Toolchain

Install Rust using `rustup`:

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal after installation.

### WebAssembly Target

Add the WebAssembly target for Soroban contracts:

```sh
rustup target add wasm32v1-none
```

### Stellar CLI

Install the Stellar CLI to interact with contracts:

#### macOS/Linux

Install with Homebrew (macOS, Linux):

```sh
brew install stellar-cli
```

Install with cargo from source:

```sh
cargo install --locked stellar-cli@23.1.3
```

:::note

Installing from source requires a C build system. To install a C build system on Debian/Ubuntu, use:

```sh
sudo apt update && sudo apt install -y build-essential
```

#### Windows

Download the installer from the [latest release](https://github.com/stellar/stellar-cli/releases/latest) and follow the setup wizard.

Restart your terminal after installation.

For more installation options, see the [Stellar CLI documentation](https://developers.stellar.org/docs/tools/cli/stellar-cli).

## Project Structure

This repository uses the recommended structure for a Soroban project:

```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- New Soroban contracts can be put in `contracts`, each in their own directory. There is already a `hello_world` contract in there to get you started.
- If you initialized this project with any other example contracts via `--with-example`, those contracts will be in the `contracts` directory as well.
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.
- Frontend libraries can be added to the top-level directory as well. If you initialized this project with a frontend template via `--frontend-template` you will have those files already included.

## Build Instructions

To build a contract, navigate to the contract directory and run:

```sh
cd contracts/
stellar contract build
```

This will compile the contract to WebAssembly and place the `.wasm` file in `target/wasm32v1-none/release/`.

## Test Instructions

To run the tests for a contract:

```sh
cd contracts/
cargo test
```

This runs the unit tests defined in `contracts/*/src/test.rs`.

## Deploy Locally

To deploy a contract locally using the Stellar CLI sandbox:

1. Start the local sandbox (if not already running):

```sh
stellar network start --local
```

2. Generate a test identity (if needed):

```sh
stellar keys generate alice --network standalone
```

:::note

You can change the name `alice` to whichsoever name you prefer.

3. Deploy the contract to testnet:

```sh
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello_world.wasm \
  --source-account alice \
  --network testnet \
  --alias hello_world
```

This will output the contract ID, which you can use to interact with the deployed contract.
