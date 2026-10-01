# Gas & Resource Fee Estimation Guide for Backend Integrators

/* Authorized Protocol Quality Assurance & Formal Verification Test Suite */

This guide provides resource footprint baselines and fee estimation strategies for backend engineers calling the `payment_escrow` and `revenue_distribution` smart contracts from NestJS (`backend/src/payments/soroban`).

---

## 1. Soroban Fee Architecture Overview

Soroban transactions incur two distinct fee components on the Stellar network:

1. **Inclusion Fee (`base_fee`)**:
   - The fee paid to validators to include the transaction in the ledger consensus.
   - Minimum: 100 stroops (`0.00001 XLM`).
   - Recommended: 100–1,000 stroops depending on network surge pricing.

2. **Resource Fee**:
   - Computed deterministically based on resource consumption:
     - **CPU Instructions**: Computation executed by the eBPF VM.
     - **Memory (RAM)**: Peak allocations during contract invocation.
     - **Read Bytes / Entries**: Size and number of ledger keys loaded.
     - **Write Bytes / Entries**: Size and number of ledger keys updated or created.
     - **Rent / TTL Extensions**: Persistent storage retention cost.

---

## 2. Contract Expected Resource Footprints

The following benchmarks are derived from formal test suite executions and Soroban RPC simulations under Soroban Protocol 20+:

### A. `payment_escrow` Contract

| Entrypoint | CPU Instructions | Memory (Bytes) | Read Ledger Entries | Write Ledger Entries | Est. Resource Fee (stroops) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `create(escrow_id, payer, beneficiary, amount)` | 380,000 – 480,000 | 140 KB – 190 KB | 2 (Instance + Token Balance) | 2 (Escrow Key + Token Transfer) | ~45,000 – 65,000 |
| `release(escrow_id)` | 320,000 – 420,000 | 110 KB – 160 KB | 2 (Instance + Escrow Record) | 2 (Status Update + Token Transfer) | ~38,000 – 52,000 |
| `refund(escrow_id)` | 320,000 – 420,000 | 110 KB – 160 KB | 2 (Instance + Escrow Record) | 2 (Status Update + Token Transfer) | ~38,000 – 52,000 |
| `get_status(escrow_id)` | 120,000 – 180,000 | 50 KB – 80 KB | 1 (Escrow Record) | 0 (Read-only simulation) | 0 (Unsubmitted simulation) |

### B. `revenue_distribution` Contract

| Entrypoint | CPU Instructions | Memory (Bytes) | Read Ledger Entries | Write Ledger Entries | Est. Resource Fee (stroops) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `distribute(batch_id, recipients, splits)` (N=3) | 520,000 – 680,000 | 210 KB – 280 KB | 4 | 4 | ~75,000 – 95,000 |
| `distribute(batch_id, recipients, splits)` (N=10)| 950,000 – 1,400,000 | 380 KB – 520 KB | 11 | 11 | ~140,000 – 195,000 |

---

## 3. Backend Estimation Strategy & Safety Buffers

### Step 1: RPC Simulation (`simulateTransaction`)
Always simulate transactions before submission to obtain exact resource footprints from the node:
```typescript
import { SorobanRpc, Transaction } from '@stellar/stellar-sdk';

const server = new SorobanRpc.Server(rpcUrl);
const simResult = await server.simulateTransaction(transaction);

if (SorobanRpc.Api.isSimulationSuccess(simResult)) {
  // Extract minimum resource fee calculated by RPC
  const minResourceFee = BigInt(simResult.minResourceFee);
}
```

### Step 2: Apply the 20% Safety Buffer
Network conditions, concurrent storage rent changes, and state bumps can cause unbuffered transactions to fail with `HostError(BudgetExceeded)`. Apply a **20% safety margin**:

$$\text{FinalResourceFee} = \lceil \text{SimulatedResourceFee} \times 1.20 \rceil$$

```typescript
const SAFETY_BUFFER_BPS = 12000n; // 120%
const bufferedResourceFee = (BigInt(simResult.minResourceFee) * SAFETY_BUFFER_BPS) / 10000n;
```

### Step 3: Footprint Restoration Check
If an escrow entry has exceeded its ledger rent threshold, `simResult.restorePreamble` will be populated. The backend must submit a `RestoreFootprintOp` prior to invoking `release` or `refund`.

---

## 4. Congestion & Failure Retry Policies

1. **`txFAILED` with `RESOURCE_LIMIT_EXCEEDED`**:
   - Immediate action: Re-simulate the transaction against the latest ledger and apply an increased buffer of 25%.
2. **`txINSUFFICIENT_FEE`**:
   - Immediate action: Increase inclusion fee from standard base (100 stroops) up to 1,000 stroops during ledger surge congestion.
3. **Idempotency**:
   - Calling `create` with the same `escrow_id` will fail cleanly with `Error::AlreadyExists`, ensuring duplicate fee expenditures never create phantom escrows.
