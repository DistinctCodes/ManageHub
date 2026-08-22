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
  server issues a single-use nonce, the user signs it with their own
  wallet (e.g. Freighter), the server verifies the signature against the
  claimed public key. The server never has custody here.

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
this module changes. Every decrypt (via `KeyCustodyService.sign`) is
recorded in `wallet_key_access_log`, success or failure.

If the KMS/decrypt step fails, `sign()` throws a clean
`InternalServerErrorException` — there is no fallback to an unencrypted
path.

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
