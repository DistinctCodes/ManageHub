# Runbook: Recovering In-Flight Escrows When SOROBAN_ENABLED=false

## Context

When `SOROBAN_ENABLED` is flipped to `false`, the backend stops interacting with
the Stellar escrow contract. Any escrows that were already created on-chain but
not yet resolved (`AWAITING_CONFIRMATION` status in the database) will remain
locked on-chain indefinitely.

The backend will log a startup warning if it detects unresolved escrows while
Soroban is disabled. This runbook describes how an operator can manually resolve
them.

---

## Prerequisites

1. **Stellar CLI** installed:
   ```sh
   # macOS
   brew install stellar-cli

   # Or via Cargo
   cargo install --locked stellar-cli
   ```

2. Access to the **treasury/operator secret key** (`STELLAR_SECRET_KEY` from `.env`).

3. The **contract ID** (`STELLAR_ESCROW_CONTRACT_ID` from `.env`).

4. The **network passphrase** (`STELLAR_NETWORK` from `.env`).

---

## Step 1: Identify Unresolved Escrows

Query the database for payments stuck in `AWAITING_CONFIRMATION` on the Stellar rail:

```sql
SELECT id, rail, status, metadata
FROM payments
WHERE rail IN ('STELLAR_CUSTODIAL', 'STELLAR_EXTERNAL')
  AND status = 'AWAITING_CONFIRMATION';
```

For each result, compute the escrow ID (SHA-256 of the payment UUID in hex).

---

## Step 2: Check On-Chain Status

Verify the current state of each escrow on-chain:

```sh
stellar contract invoke \
  --id $STELLAR_ESCROW_CONTRACT_ID \
  --network-passphrase "$STELLAR_NETWORK" \
  --rpc-url $STELLAR_RPC_URL \
  --source $STELLAR_SECRET_KEY \
  -- \
  get_status \
  --escrow_id $ESCROW_ID_HEX
```

Expected return values:
- `1` — **Locked** (still holding funds, can be released or refunded)
- `2` — **Released** (already sent to beneficiary)
- `3` — **Refunded** (already returned to payer)

If the status is already `2` or `3`, you only need to update the database record.

---

## Step 3: Release or Refund

### To release funds to the beneficiary:

```sh
stellar contract invoke \
  --id $STELLAR_ESCROW_CONTRACT_ID \
  --network-passphrase "$STELLAR_NETWORK" \
  --rpc-url $STELLAR_RPC_URL \
  --source $STELLAR_SECRET_KEY \
  -- \
  release \
  --escrow_id $ESCROW_ID_HEX
```

### To refund funds to the payer:

```sh
stellar contract invoke \
  --id $STELLAR_ESCROW_CONTRACT_ID \
  --network-passphrase "$STELLAR_NETWORK" \
  --rpc-url $STELLAR_RPC_URL \
  --source $STELLAR_SECRET_KEY \
  -- \
  refund \
  --escrow_id $ESCROW_ID_HEX
```

---

## Step 4: Update the Database

After resolving each escrow on-chain, update the corresponding payment record:

```sql
-- If released:
UPDATE payments SET status = 'CONFIRMED' WHERE id = '<payment-uuid>';

-- If refunded:
UPDATE payments SET status = 'REFUNDED' WHERE id = '<payment-uuid>';
```

---

## Step 5: Verify

Re-run the query from Step 1 to confirm no unresolved escrows remain. Restart
the backend — the startup warning should no longer appear.
