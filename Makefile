# ManageHub — Soroban contracts workspace
#
# Unified build/test/deploy/clean targets spanning every crate in
# contracts/ (CT-70). Run `make help` for the full target list.

CONTRACTS_DIR := contracts
NETWORK ?= testnet

.PHONY: help build test deploy clean audit

help:
	@echo "Targets:"
	@echo "  make build   - cargo build --release (wasm32-unknown-unknown) for the contracts workspace"
	@echo "  make test    - cargo test for the contracts workspace"
	@echo "  make deploy  - build then 'soroban contract deploy' every crate in the workspace"
	@echo "                 (override the target network with NETWORK=<name>, default: testnet)"
	@echo "  make clean   - cargo clean for the contracts workspace"
	@echo "  make audit   - run the CT-72 require_auth() coverage audit"

build:
	cd $(CONTRACTS_DIR) && cargo build --release --target wasm32-unknown-unknown

test:
	cd $(CONTRACTS_DIR) && cargo test

deploy: build
	@for crate in $(CONTRACTS_DIR)/*/; do \
		name=$$(basename $$crate); \
		wasm=$(CONTRACTS_DIR)/target/wasm32-unknown-unknown/release/$$name.wasm; \
		if [ -f "$$wasm" ]; then \
			echo "Deploying $$name to $(NETWORK)..."; \
			soroban contract deploy --wasm "$$wasm" --network $(NETWORK); \
		fi; \
	done

clean:
	cd $(CONTRACTS_DIR) && cargo clean

audit:
	bash scripts/audit_require_auth.sh
