# Credits — micropayment ledger & multi-party revenue distribution

Issue #1575, the sixth issue in the payment track. Depends on #1570 (a
payment funds a top-up) and #1574 (the on-chain leg of settlement).

## Why this module exists

Not every coworking charge is booking-sized. Per-minute resource usage,
printing and meeting-room overage are too small and too frequent to settle
individually on-chain — the fee and the latency would dwarf the charge.
Separately, some payments need to split across several recipients (platform
fee, hub operator payout, referral reward) instead of landing in one
account.

Both problems have the same answer: an internal double-entry ledger that
batches value movement instead of transacting per event.

## The ledger

Two tables carry the truth:

- **`ledger_accounts`** — one per member, plus the singleton system
  accounts. `balance` is a *materialized cache* of the entries below; it
  exists so an overdraft check is O(1) and so a charge has one row to lock.
- **`ledger_entries`** — append-only debit/credit halves, grouped by
  `ledger_transactions`. Never updated (except the two settlement markers)
  and never deleted: a correction is a new REVERSAL or ADJUSTMENT
  transaction, so the audit trail only grows.

Three invariants everything else rests on:

1. **Every transaction balances.** Debits equal credits, validated before
   anything is written, so the sum of all balances in a currency is always
   exactly zero and the ledger can be audited by addition alone.
2. **`ledger_transactions.reference` is unique.** A replayed charge, a
   re-run settlement pass, a resumed batch job — all collide on it and get
   the original transaction back (`posted: false`). Callers never have to
   reason about whether their retry posted twice.
3. **Accounts are locked in ascending id order** before any balance is read
   or written, so concurrent transactions serialize instead of deadlocking.

`GET /credits/admin/ledger/integrity` re-derives every balance from the
entries and reports drift — that is what keeps the cache honest.

### Account kinds and what TREASURY means

`USER` is a member's spendable credit. `REVENUE` is where micro-charges
accumulate before distribution. `PLATFORM_FEE`, `HUB_OPERATOR` and
`REFERRAL` are payable balances. `TREASURY` is the **contra/clearing
account** standing in for the outside world: it is debited when money
enters (a top-up) and credited when money leaves (a confirmed payout). Its
balance is therefore the negation of what the platform owes, and it is
*expected* to sit deeply negative.

## The spend path

`POST /credits/charge` — internal, ADMIN-guarded, meant for resource-usage
features running with a service identity rather than for end users (a
member must not be able to name the amount they are charged). It debits the
member and credits `REVENUE` synchronously. No payment rail, no chain call,
nothing in the hot path but one locked row.

### Overdraft policy

A charge is refused the moment it would take the account below
`-overdraftLimit`. That limit defaults to `CREDITS_DEFAULT_OVERDRAFT_LIMIT`
(0 — no overdraft at all) and can be raised per account by an admin for
graceful degradation, e.g. letting a session finish slightly negative
rather than cutting it off mid-use.

The check runs inside the transaction holding the account's row lock, which
is what makes the **overdraft race** safe: two charges that are each
individually affordable but not affordable together can never both succeed.
One wins, the other gets a 409. `credits.service.spec.ts` fires 25
concurrent charges at a fixed balance and asserts exactly ten land.

The policy is enforced for `USER` accounts only. System accounts are the
other side of movements that have already happened — constraining them
would only make correct bookkeeping impossible.

### The metered call site

`POST /credits/usage` (`MeteredUsageService`) is the in-repo caller of the
charge path: it prices a meter reading (`units × unitPrice`), records it in
`metered_usage_events`, and charges it. Idempotent on the caller's
`usageReference`, via two independent unique keys pointing at the same
natural reference — so a retried delivery records once and charges once
even if it fails between the two writes.

This is the shape a resource-usage feature has: it owns the pricing and the
usage audit record and hands the ledger nothing but an amount and a dedupe
key. **Note:** this backend has no per-minute usage / printing / room
module yet, so this is the metering surface until one lands; a real one
should call `CreditsService.charge` (or this endpoint) the same way.

## The top-up path

A `#1570` fiat or `#1574` on-chain payment funds a member's balance: one
payment funds many future micro-charges. A payment declares itself a top-up
by carrying `metadata.purpose = "CREDIT_TOP_UP"` at initiation time, or by
being marked afterwards via `POST /credits/admin/payments/:id/top-up`.

`PaymentCreditsService` **sweeps CONFIRMED payments** rather than hooking
into the confirmation path. Three reasons: the dependency stays
one-directional (credits reads payments, never the reverse — which is also
why the payment/credit link table lives here rather than as columns on
`payments`); a payment confirmed while this service was down is still
picked up next pass; and it is idempotent by construction, since the unique
ledger reference is the real guard. `POST /credits/payments/:id/apply` is
the synchronous fast path for a checkout return, so a top-up is spendable
immediately.

## The split engine

A `RevenueSplitConfig` is a set of basis-point recipients, attachable to a
Payment or computed over a settlement batch. Each recipient is **either**
an internal ledger account **or** a bare external address — that choice is
what decides whether the share ever leaves the ledger.

### Two rules, both enforced before money moves

**Basis points must sum to exactly 10000 at configuration time.** A config
that could not distribute 100% of an amount is rejected with a 400 when it
is created or edited, so a settlement run never has to decide what to do
with a 97%-complete split. It is re-validated at computation time too, in
case a config was mutated by something that bypassed the service.

**Rounding never loses or duplicates value.** Any percentage split of an
integer leaves a remainder: 1000 across 3333/3333/3334 basis points floors
to 333/333/333 and loses one minor unit. Dropping it makes the ledger stop
balancing; rounding each share up can *create* value. So
`split-allocation.ts` uses the **largest-remainder method**:

1. everyone gets `floor(amount × basisPoints / 10000)`;
2. the leftover (always strictly fewer units than there are recipients) goes
   one minor unit at a time to the largest fractional remainders;
3. ties break deterministically — lower `sortOrder` first, then input
   position — so identical inputs always allocate identically and no
   auditor has to chase run-to-run drift.

The result sums to exactly the input amount, which is also what lets a
split be posted as balanced double-entry legs (the ledger refuses
unbalanced ones). `POST /credits/admin/splits/preview` shows the allocation
and each recipient's share of the remainder without posting anything.

A config attached to a **Payment** must be entirely internal: moving value
off-platform is the settlement batch's job, so an operator's share lands in
their payable account and leaves in one netted transfer instead of one per
payment.

## Batch settlement

`SettlementService` runs hourly (`CREDITS_SETTLEMENT_ENABLED`) and can be
driven by hand from `POST /credits/admin/settlement/run`. A pass resumes
every open batch *before* creating new work, then creates up to two kinds of
batch per currency:

- **DISTRIBUTION** — splits the `REVENUE` account's undistributed balance
  across `CREDITS_SETTLEMENT_SPLIT_CONFIG`. Internal shares post as ledger
  entries immediately (nothing to wait for); external shares become payouts
  the rail has to confirm.
- **NET_PAYABLE** — nets each account that has an
  `external_payout_address` and pays that address. One on-chain transfer per
  account per cycle, however many micro-movements went into it.

### Why it is safe to crash mid-run

1. **Amounts come from account balances, not a running tally.** A payout
   that never happened leaves the balance untouched, so the next pass sees
   the same amount still owed. Nothing has to be rolled back.
2. **One in-flight payout per account.** A batch is never created for an
   account that already has a PENDING or SUBMITTED payout, so the same
   balance cannot be committed to two batches. Batch *creation* also takes
   a transaction-scoped advisory lock, so two passes never interleave.
3. **Per-payout idempotency keys.** Re-executing a batch hands the rail the
   same key — which the rail dedupes on — so a crash between "submitted"
   and "recorded as submitted" cannot pay twice. Retries deliberately reuse
   the key rather than minting a new one.

And the rule those exist to protect: **a submission is not a settlement.**
The ledger drawdown and the per-entry `settled_at` marker are written only
after the rail confirms the payout from fresh state. If the on-chain leg
fails, the ledger still shows the balance as owed — never as paid. An
unreachable rail is treated as indeterminate, not as failure.

`ledger_entries` carries two separate markers for this:
`settlement_batch_id` is the **claim** (this movement was accounted for by
batch X, and no other), `settled_at` is the **settled** marker, written only
on confirmation. `POST .../abandon` releases the claims a batch never
settled and posts nothing, because a payout that never happened has no
ledger effect to undo.

`GET /credits/admin/settlement/batches/:id` is the full audit view: entries
in, recipients out, and the on-chain transaction reference for every
off-platform leg.

## The on-chain leg (#1574)

Settlement depends on the `ExternalPayoutRail` port, not on a chain. The
adapter (`payments/soroban/soroban-payout.adapter.ts`) implements it over
the existing escrow contract: a treasury-funded escrow created for, and
released to, the recipient. The escrow id is derived by hash from the
payout's idempotency key (domain-prefixed so it can never collide with a
payment's escrow), and the queue job id is derived from it too — so a
duplicate enqueue collapses and re-submitting is a no-op.

`getPayoutStatus` is a fresh contract-state read: only `RELEASED` is
`confirmed`. `LOCKED` and `NOT_FOUND` are both `pending` — `NOT_FOUND`
covers "still queued" as much as "never created", so calling it a failure
would race settlement against its own queue.

When the Soroban rail is disabled the port resolves to null, and settlement
says so explicitly: payouts stay PENDING and the run summary reports
`payoutsAwaitingRail` rather than quietly marking anything settled.

## API surface

| Endpoint | Who | What |
| --- | --- | --- |
| `POST /credits/charge` | admin/service | Debit a member's balance (idempotent on `reference`) |
| `POST /credits/usage` | admin/service | Price and charge a metered reading |
| `GET /credits/balance` | member | Own balance, ceiling and spendable amount |
| `GET /credits/statement` | member | Own append-only entries |
| `GET /credits/usage` | member | Own metered usage history |
| `POST /credits/payments/:id/apply` | owner/admin | Apply a confirmed payment now |
| `GET/POST/PATCH /credits/admin/accounts...` | admin | Account policy: overdraft, payout address, freeze |
| `POST /credits/admin/adjustments` | admin | Correct a balance (reason required, audited) |
| `GET /credits/admin/ledger/integrity` | admin | Balance-vs-entries drift report |
| `POST/GET/PUT /credits/admin/splits...` | admin | Split config CRUD, activation, preview |
| `POST /credits/admin/payments/:id/split-config` | admin | Attach a split to a payment |
| `POST /credits/admin/settlement/...` | admin | Run, create, execute, retry, abandon, inspect batches |

## Tests

- `split-allocation.spec.ts` — the rounding rule across many configs and
  amounts: the allocation always sums to exactly the input, the remainder is
  never dropped or duplicated, and ties break deterministically.
- `credits.service.spec.ts` — N concurrent charges never overdraw past the
  ceiling; replays charge once; the materialized balance always agrees with
  the entries.
- `ledger.service.spec.ts` — double-entry validation, account resolution
  races, multi-leg splits, replay semantics.
- `revenue-split.service.spec.ts` — configuration-time rejection of a
  broken split, and balanced posting of a payment distribution.
- `settlement.service.spec.ts` — submission is not settlement, a failed leg
  leaves nothing settled, and re-running a batch never double-pays.
- `metered-usage.service.spec.ts` — pricing and double-write recovery.
- `payment-credits.service.spec.ts` — top-ups and payment splits apply once.
- `payments/soroban/soroban-payout.adapter.spec.ts` and the `payout` cases
  in `escrow-submission.processor.spec.ts` — the on-chain leg's determinism
  and its refusal to re-create or re-release an escrow.

## Known gaps

- No dedicated resource-usage module exists in this backend yet, so the
  metered call site is `POST /credits/usage` (see above) rather than a
  per-minute session tracker.
- `POST /credits/charge` and `POST /credits/usage` are guarded by the ADMIN
  role because that is the closest primitive this codebase has to a service
  identity. In a deployment with a service mesh, these are the endpoints to
  put behind a service token.
- Settlement executes one step per pass (submit, then poll on the next
  pass). That keeps each pass bounded and predictable; it also means a
  payout takes at least two passes to reach CONFIRMED.
- Multi-currency is modelled (accounts, entries and transactions are all
  currency-scoped and never mix) but there is no FX conversion anywhere: a
  charge and the balance it draws on must be in the same currency.
