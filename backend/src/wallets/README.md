# Wallets module

Custodial Stellar wallet onboarding and non-custodial "connect your own
wallet" linking (issue #1573), payment track item 4/7. Builds on #1570's
payment domain model — `WalletAccount#userId` is the same id space as
`Payment#userId`.

## Two custody paths, one account-to-wallet model

- **Custodial** — `WalletsService.provisionCustodialWallet` generates a
  Stellar keypair server-side and stores the secret encrypted at rest.
  Nothing outside `KeyCustodyService` ever sees the plaintext secret; only
  the public `walletAddress` is exposed via the API.
- **External** — `WalletsService.createLinkChallenge` /
  `verifyAndLinkExternalWallet` implement challenge-response linking: the
  server issues a single-use nonce, the user signs a structured message with
  their own wallet (e.g. Freighter), the server verifies the signature against
  the claimed public key. The server never has custody here.

The signed message is built by `buildWalletLinkMessage`
(`link-message.util.ts`) and is domain-separated and single-use:

```
ManageHub wallet link
user:<userId>
[address:<claimedAddress>]
nonce:<nonce>
expires:<ISO timestamp>
```

The bare nonce is no longer accepted, so a signature harvested from another
flow cannot be replayed here. `POST /wallets/link/challenge` may optionally
include `address`; when present the message names it, the challenge stores it,
and `verify` rejects any request whose address does not match — so verifying a
message issued for a different address is refused before the challenge is
consumed (#1946).

A user starts with at most one `wallet_accounts` row. Linking an external
wallet when the user already has a custodial one **upgrades** that row in
place (`custodyType: CUSTODIAL → EXTERNAL`) rather than creating a second
one — the custodial key material and ledger history are left in place for
audit purposes, they just stop being the active wallet.

## Key custody

`KeyCustodyService` is the only module allowed to touch a decrypted
custodial secret — see its file header. It uses envelope encryption
(`EnvelopeKeyManagementService`, `KeyManagementService` interface) with a
local AES-256-GCM master key from `WALLET_KMS_MASTER_KEY`; swapping in a
real cloud KMS means implementing the same interface, nothing else in
this module changes. Every decrypt (via `KeyCustodyService.sign`) and
wallet-account soft-deletion audit event is recorded in
`wallet_key_access_log`, success or failure.

If the KMS/decrypt step fails, `sign()` throws a clean
`InternalServerErrorException` — there is no fallback to an unencrypted
path.

## Master-key rotation

The envelope master is versioned. `EnvelopeKeyManagementService` reads a key
registry — `WALLET_KMS_MASTER_KEY` (registered under
`WALLET_KMS_DEFAULT_KEY_ID`, default `local-master-key-v1`) plus a JSON
`WALLET_KMS_MASTER_KEYS` map of additional `{ "<keyId>": "<base64>" }` masters
— and both wraps under `WALLET_KMS_ACTIVE_KEY_ID` and unwraps by each row's
`kmsKeyId`. Old rows therefore keep working while new writes move to a new
key. Admins run `POST /wallets/admin/key-rotation` (`KeyRotationService`,
`RotateKeysDto`) to re-wrap `wallet_key_material` data keys from an old
`kmsKeyId` to a new one; it is idempotent and resumable and publishes
progress on `/metrics`. See
[`key-custody/README.md`](./key-custody/README.md) for the runbook.

## Funding

`WalletsService.fundCustodialWallet` (admin-only) records a
`wallet_ledger_entries` credit; it does not move real on-chain funds. A
custodial wallet's balance is `SUM(CREDIT) - SUM(DEBIT)` over that table.
A full fiat-to-crypto on/off-ramp is out of scope for this issue — this is
just enough to make the on-chain payment rail that depends on a funded
wallet demoable.

## Idempotency and concurrency

Both `provisionCustodialWallet` and the external-link upsert follow the
same pattern as `PaymentsService.initiate` (#1570): the relevant unique
index (`uq_wallet_accounts_user_id`, `uq_wallet_accounts_external_address`)
is the real source of truth, and a losing concurrent request recovers by
re-reading instead of erroring. A custodial keypair is only ever generated
*after* the `wallet_accounts` insert has won that race, so a double-click
can never provision two keypairs for one user. Challenge consumption is
guarded by a row lock (`claimChallenge`) so a captured signature can't be
replayed to link twice.

`POST /wallets/provision` and `POST /wallets/link/verify` also accept an
optional `Idempotency-Key` header (#1947). When present,
`WalletLinkIdempotencyService` keys the response by (user, key) in Redis with
a TTL and replays it for an identical retry — so a client that times out and
retries gets its original response instead of failing on an already-consumed
challenge. Reusing a key with a *different* request body is rejected with
`422`, and a concurrent identical request waits on a short Redis lock. The
cache is best-effort: if Redis is unreachable the request still runs and only
a warning is logged, since the DB's unique constraints remain the source of
truth.
