.PHONY: build build-release bindings clean test

build:
	cargo build

build-release:
	cargo build --target wasm32-unknown-unknown --release

bindings: build-release
	cd bindings && bash generate.sh

clean:
	cargo clean
	cd bindings && rm -rf dist generated/*.ts

test:
	cargo test
