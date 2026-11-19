# Escrow lifecycle, local sandbox and compatibility

## Escrow lifecycle (#2026)
`Created -> Released` or `Created -> Refunded`. Both end states are terminal.
Backend retries are idempotent: calling `release`/`refund` again on a terminal
escrow fails without side effects, so the backend treats that error as "already done".

## Local sandbox (#2027)
```sh
stellar network container start local
stellar keys generate dev --network local --fund
cd contracts && stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/payment_escrow.wasm --source dev --network local
stellar contract invoke --id <ID> --source dev --network local -- get_escrow --escrow_id 1
```

## Compatibility table (#2028)
| Contract version | Backend release | Notes |
|---|---|---|
| 1.0.0 | 1.x | Initial escrow ABI (`fixtures/escrow-abi.json`) |
