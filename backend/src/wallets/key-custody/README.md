# Wallet key-custody rotation runbook

This runbook covers the local envelope-encryption master key and the Stellar
secret keys held by the custodial-wallet path. As of issue #1945 the master
key is versioned, `EnvelopeKeyManagementService` dispatches unwrap on each
row's `kmsKeyId`, and an admin-only re-wrap endpoint (`KeyRotationService`)
performs the migration described below.

## Scope and current implementation

There are three related pieces of key material:

| Material | Where it lives | Rotation scope |
| --- | --- | --- |
| Envelope master/KEK | `WALLET_KMS_MASTER_KEY` (plus the `WALLET_KMS_*` key registry), loaded by `EnvelopeKeyManagementService` | Routine and emergency rotation; compromise affects every custodial wallet |
| Per-wallet data key | A random 32-byte key wrapped into `wallet_key_material` | Re-wrapped whenever the envelope master changes; it is not a Stellar address key |
| Per-wallet Stellar secret | Encrypted into `wallet_key_material.encryptedSecret` and used by `KeyCustodyService.sign` | Routine target and emergency rotation; a real rotation changes the Stellar key/address and therefore needs a funds migration |

External/non-custodial wallets are out of scope: the user controls those keys
and this service never receives their secret. JWTs, webhook secrets, and
other application credentials are also outside this runbook.

What the code provides today:

- `EnvelopeKeyManagementService` reads a **key registry**: the legacy
  `WALLET_KMS_MASTER_KEY` is registered under `WALLET_KMS_DEFAULT_KEY_ID`
  (default `local-master-key-v1`), and `WALLET_KMS_MASTER_KEYS` is a JSON
  object `{ "<keyId>": "<base64>" }` registering additional masters. New
  writes are wrapped under `WALLET_KMS_ACTIVE_KEY_ID`, and `unwrapDataKey`
  dispatches on the row's `keyId`, so old rows keep unwrapping after the
  active id moves. `getConfiguredKeyIds()` lists every id this instance can
  read.
- `KeyRotationService` (exposed by the admin-only
  `POST /wallets/admin/key-rotation` endpoint) re-wraps data keys from one
  `kmsKeyId` to another in bounded batches. It is idempotent (a conditional
  `UPDATE ... WHERE kmsKeyId = <old>`) and resumable (progress is committed
  per row), so an interrupted run is finished by calling it again. Each
  re-wrap is recorded in the admin audit trail (`KEY_MATERIAL_ROTATED`), and
  rotated/remaining counts are published on `/metrics`.

What is still out of scope (unchanged by #1945):

- There is **no key history/version table**: `wallet_key_material` holds one
  current row per wallet, so a `created_at` value is not a rotation
  timestamp. Keep a before/after snapshot or external manifest as the proof
  of which rows were re-wrapped.
- A master re-wrap does **not** change a wallet's Stellar address. An
  individual Stellar-secret rotation still needs a reviewed funds/address
  migration (see below).

## Cadence and ownership

| Target | Recommended interval | Owner and rationale |
| --- | --- | --- |
| Envelope master/KEK | **Every 90 days**, and immediately for any emergency trigger | The Security/Platform key custodian owns the schedule; a master-key compromise has the largest blast radius, while a quarterly change bounds exposure and keeps the operational batch manageable. |
| Active custodial Stellar secret | **Review and target rotation every 180 days**, or sooner for a trigger | Wallet Operations owns the wallet migration with Security approval. The interval is longer than the master interval because replacing a Stellar key can change an address, require moving funds, and affect reconciliation; the blast radius is one wallet rather than the whole estate. |

The 180-day per-wallet target is a policy target, not an instruction to edit
ciphertext in place. Until a safe address/funds migration is implemented,
schedule a reviewed manual migration and keep affected wallets disabled or
queued while it is performed. A dormant custodial key should be reviewed and
retained securely rather than replaced without a plan for its address and
ledger state.

## Emergency triggers

Treat these as out-of-band rotations, not as work that waits for the calendar.
The first action is always containment; do not paste secret material into a
ticket, log, query, or trace.

| Trigger | Urgency | First action |
| --- | --- | --- |
| Suspected compromise of a master or wallet key | **P0 / immediate** | Stop signing and revoke the exposed credential/access path; identify the affected key ID and wallets, preserve evidence, and start the incident timeline. |
| Key material appeared in logs, backups, tickets, or other uncontrolled storage | **P0 / immediate** | Quarantine the artifact and access path, rotate or invalidate the exposed copy, and determine whether the master or an individual wallet is affected before resuming signing. |
| Staff or role change with access to key material | **P1 / same business day** | Remove or reduce the person's access first; rotate the master if they could read it, or the individual wallet if they could use its signing path. |
| Offboarding | **P1 / before the departure or immediately after** | Revoke credentials and sessions, preserve the access log, and rotate every key the departing person could access. |
| Provider/KMS confidentiality or integrity incident | **P0 / immediate** | Stop unwrap/signing if confidentiality or integrity is uncertain, contact the provider, preserve provider audit evidence, and wait for a trusted replacement key/version. |
| Failed integrity or authentication check | **P1 / immediately** | Disable the affected wallet or batch, preserve the row and logs, do not “repair” ciphertext, and validate the old/new key path before any retry. |

## Master-key rotation procedure

The safe order is **read old, write new**. The old key remains available until
all rows and in-flight work have been verified.

1. **Declare and freeze scope.** Open an approved change/incident record,
   identify the current `kmsKeyId` and affected wallet count, and stop
   concurrent key-rewrites. Take an encrypted backup/snapshot of
   `wallet_key_material` and the relevant configuration. Never export or log a
   plaintext Stellar secret.
2. **Prepare a new version and register it.** Generate a new 32-byte base64
   master key in the approved secret manager, assign a new, unique `kmsKeyId`
   (for example `local-master-key-v2`), and register it in `WALLET_KMS_MASTER_KEYS`
   as `{ "<keyId>": "<base64>" }` on **every** application instance. Keep the
   old key listed (either still as `WALLET_KMS_MASTER_KEY` or in the registry).
   Do not edit `WALLET_KMS_MASTER_KEY` in place and do not overwrite the old
   value with a newly generated key.
3. **Make every signer dual-read before writing new rows.** Deploy the registry
   config from step 2 first. `EnvelopeKeyManagementService` now dispatches
   `unwrapDataKey` on the row's `keyId`, so every instance can read both the old
   and new masters. Confirm with `getConfiguredKeyIds()` (or an in-memory
   decrypt check) that both ids are present *before* any re-wrap or write.
4. **Re-wrap each wallet's data key via the rotation endpoint.** Call the
   admin-only `POST /wallets/admin/key-rotation` with
   `{ "fromKeyId": "<old>", "toKeyId": "<new>" }` (optionally `batchSize` /
   `maxBatches` to bound one call). The job reads each row's old wrapped data
   key, unwraps it with the old master, wraps the *same* data key with the new
   master, and updates `kms_key_id` plus the wrapped-key fields with a
   conditional `UPDATE ... WHERE kms_key_id = <old>`. `encrypted_secret` and its
   IV/tag are left unchanged: the Stellar secret is still protected by the same
   data key. Because the update is conditional and committed per row, the run is
   idempotent and resumable — simply re-invoke it until the returned
   `remaining` is `0`.
5. **Switch writes to new.** Set `WALLET_KMS_ACTIVE_KEY_ID` to the new id only
   after every row has a new master available and (ideally) after the backlog
   is drained. New data keys are then wrapped under the new id while old rows
   still unwrap. Keep the old key registered through the verification window.
6. **Retire the old key last.** Confirm the endpoint reports no remaining
   old-id rows, no queued or in-flight operation holds an old wrapped key, and
   there is no rollback need. Then remove the old value from
   `WALLET_KMS_MASTER_KEY`/`WALLET_KMS_MASTER_KEYS` and revoke/delete it
   according to the secret-manager retention policy. Never remove it merely
   because an environment variable was changed.

### In-flight signing during the window

`KeyCustodyService.sign` reads one material row, unwraps its data key, signs,
and records the attempt. With the registry deployed (step 3), a signer can read
both versions, so a transaction that commits before the row switch finishes
against the old version and one that reads after the switch uses the new version
without pausing. If dual-read cannot be guaranteed, pause the relevant
signing/reconciliation queue, drain in-flight work, take a consistent snapshot,
switch atomically, and only then resume. Do not delete the old key while a
process may still hold it.

## Verifying a completed rotation

- Compare the before/after inventory and migration manifest: every intended
  wallet is present exactly once and every target row has the new
  `kmsKeyId` and a complete new IV/tag set.
- Run an integrity/decryption check that handles secrets in memory only, then
  perform a controlled signature against a known payload and verify it with
  the wallet's public address. Do not print the secret or the unwrapped data
  key.
- Check `wallet_key_access_log` for the change window. It records successful
  and failed signing/decrypt attempts, so it identifies wallets that were
  actually exercised and helps detect new failures. It does **not** record a
  re-wrap event, and its rows are subject to the retention policy in
  `src/retention/README.md`; use the before/after material snapshot and the
  external migration manifest as the proof of which rows were re-wrapped.
- Confirm the old `kmsKeyId` count is zero, all application instances report
  the new reader version, and the old secret is unavailable only after the
  rollback window closes.

## Rollback and abort

Abort before retiring the old key if a verification fails: stop new writes and
signing, restore the affected row snapshot and the old reader/configuration,
and confirm signing works again. Because the table has one current row per
wallet and no key history, a snapshot/manifest is required for rollback; a
`created_at` value is not a rotation timestamp.

If key material was exposed, rollback is not a remediation. Keep the affected
wallets contained and rotate again to a fresh key. Record the failed check,
the operator, timestamps, affected wallet IDs, and the final disposition in
the incident record without recording secrets.

## Individual Stellar-key rotation

A master re-wrap does not replace a Stellar secret. A true individual rotation
requires generating a new keypair, moving or reconciling the wallet's funds and
application state, updating the wallet address, and persisting a new encrypted
secret. `provisionKeypair` currently creates key material only while
provisioning a new custodial wallet; there is no in-place rotation method,
endpoint, or address migration job. Until that capability exists, use a
reviewed manual/provider procedure and keep the old wallet disabled until the
new address and funds path have been verified.

## Incident timeline/checklist

1. **Detect:** record the signal, time, key ID if known, affected wallets,
   and the last trusted configuration; preserve logs and access records.
2. **Contain:** revoke access, stop or queue affected signing, quarantine
   exposed material, and notify Security/Platform and Wallet Operations.
3. **Rotate:** prepare a new key/version, establish dual-read, re-wrap in
   read-old/write-new order (or execute the approved Stellar-address migration),
   and keep the old key until the verification gate passes.
4. **Verify:** check row IDs/counts, integrity, a known-payload signature,
   failure logs, queue health, and the absence of old-key references.
5. **Document:** close or roll back explicitly, revoke the old key, archive the
   manifest and relevant `wallet_key_access_log` evidence, and record owners,
   approvals, timestamps, and follow-up work.
