# ManageHub — Soroban contracts workspace
#
# Unified build/test/deploy/clean targets spanning every crate in
# contracts/ (CT-70). Run `make help` for the full target list.

CONTRACTS_DIR := contracts
NETWORK ?= testnet
SOURCE ?=

.PHONY: help build test deploy clean audit dev sandbox

help:
	@echo "Targets:"
	@echo "  make build   - cargo build --release (wasm32-unknown-unknown) for the contracts workspace"
	@echo "  make test    - cargo test for the contracts workspace"
	@echo "  make deploy  - build, optimise, deploy and initialise the contracts with the stellar CLI"
	@echo "                 (NETWORK=<name> default testnet, SOURCE=<identity> required)"
	@echo "  make sandbox - run the local standalone Stellar sandbox (Docker + deploy + create/release + .env)"
	@echo "  make clean   - cargo clean for the contracts workspace"
	@echo "  make audit   - run the CT-72 require_auth() coverage audit"

build:
	cd $(CONTRACTS_DIR) && cargo build --release --target wasm32-unknown-unknown

test:
	cd $(CONTRACTS_DIR) && cargo test

deploy: build
	@test -n "$(SOURCE)" || (echo "Set SOURCE=<stellar identity>"; exit 1)
	NETWORK=$(NETWORK) SOURCE=$(SOURCE) bash $(CONTRACTS_DIR)/scripts/deploy.sh

clean:
	cd $(CONTRACTS_DIR) && cargo clean

audit:
	bash scripts/audit_require_auth.sh

sandbox:
	bash $(CONTRACTS_DIR)/scripts/sandbox.sh $(ARGS)

dev:
	docker compose up --build
