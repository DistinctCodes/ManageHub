# Contracts RUNBOOK

Operational steps for the Soroban contracts.

## `revenue_distribution` (#1880)

1. Deploy and initialise the contract with the admin address.
2. Configure the split as the admin, with beneficiary basis points summing to
   `10_000`.
3. Distribute: funds are allocated proportionally to each beneficiary.

## End-to-end: `payment_escrow` create -> release (#1879)

```sh
# 1. Payer creates a locked escrow.
soroban contract invoke --id $ESCROW_ID --source $PAYER \
  -- create --payer $PAYER --beneficiary $BENEFICIARY --amount 1000

# 2. Read it back with the read-only view (#1878).
soroban contract invoke --id $ESCROW_ID -- get_escrow --id $ESCROW_ID

# 3. Beneficiary releases the funds.
soroban contract invoke --id $ESCROW_ID --source $BENEFICIARY \
  -- release --id $ESCROW_ID
```
