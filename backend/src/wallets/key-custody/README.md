# Wallet key-custody rotation runbook

This runbook covers the local envelope-encryption master key and the Stellar
secret keys held by the custodial-wallet path. It is an operational policy,
not a claim that the current branch exposes a rotation API.

## Scope and current implementation

There are three related pieces of key material:

| Material | Where it lives | Rotation scope |
| --- | --- | --- |
| Envelope master/KEK | `WALLET_KMS_MASTER_KEY`, loaded by `EnvelopeKeyManagementService` | Routine and emergency rotation; compromise affects every custodial wallet |
| Per-wallet data key | A random 32-byte key wrapped into `wallet_key_material` | Re-wrapped whenever the envelope master changes; it is not a Stellar address key |
| Per-wallet Stellar secret | Encrypted into `wallet_key_material.encryptedSecret` and used by `KeyCustodyService.sign` | Routine target and emergency rotation; a real rotation changes the Stellar key/address and therefore needs a funds migration |

External/non-custodial wallets are out of scope: the user controls those keys
and this service never receives their secret. JWTs, webhook secrets, and
other application credentials are also outside this runbook.

The current code has an important limitation. `WalletKeyMaterial.kmsKeyId`
and the wrapped-key fields are designed to identify a KEK version, but
`EnvelopeKeyManagementService.wrapDataKey` currently hard-codes
`local-master-key-v1`, and `unwrapDataKey` accepts `keyId` but reads the single
current `WALLET_KMS_MASTER_KEY` without dispatching on that ID. There is no
rotation endpoint, re-wrap job, key registry, key history table, or automated
Stellar-address migration in this branch. Do not assume that changing an
environment variable performs a migration.

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

## Planned master-key rotation procedure

The safe order is **read old, write new**. The old key remains available until
all rows and in-flight work have been verified.

1. **Declare and freeze scope.** Open an approved change/incident record,
   identify the current `kmsKeyId` and affected wallet count, and stop
   concurrent key-rewrites. Take an encrypted backup/snapshot of
   `wallet_key_material` and the relevant configuration. Never export or log a
   plaintext Stellar secret.
2. **Prepare a new version.** Generate a new 32-byte base64 master key in the
   approved secret manager and assign a new, unique `kmsKeyId` (for example,
   `local-master-key-v2`). Keep the old key available. Do not edit
   `WALLET_KMS_MASTER_KEY` in place and do not overwrite the old value with a
   newly generated key.
3. **Make every signer dual-read before writing new rows.** Deploy a reviewed
   implementation or one-off script that selects the master by the row's
   `kmsKeyId` and can read both versions. The current
   `EnvelopeKeyManagementService` does not provide that dispatch, so this step
   requires a code/configuration change or a controlled maintenance process;
   there is no built-in rotation command to run.
4. **Re-wrap each wallet's data key.** For each row, read the old wrapped data
   key, unwrap it with the old master, wrap the same data key with the new
   master, and update `kms_key_id`, `wrapped_data_key`,
   `wrapped_data_key_iv`, and `wrapped_data_key_tag` in one transaction. Leave
   `encrypted_secret` and its IV/tag unchanged: the Stellar secret is still
   protected by the same data key. A row is either wholly old or wholly new;
   never leave a new `kmsKeyId` with old wrapped fields.
5. **Switch writes to new.** Only after all application instances can read
   both versions should new writes use the new ID. Keep a read-old/write-new
   deployment through the verification window. In the current one-key
   implementation, pause signing/queue processing during the switch instead
   of risking a process that can read only one version.
6. **Retire the old key last.** Confirm there are no old-ID rows, no queued or
   in-flight operation holding an old wrapped key, and no rollback need. Then
   revoke/delete the old master according to the secret-manager retention
   policy. Never remove it merely because the environment variable was
   changed.

### In-flight signing during the window

`KeyCustodyService.sign` reads one material row, unwraps its data key, signs,
and records the attempt. A transaction that commits before the row switch can
finish against the old version; one that reads after the switch needs the new
version. Dual-read on every instance makes both cases safe. If dual-read
cannot be guaranteed, pause the relevant signing/reconciliation queue, drain
in-flight work, take a consistent snapshot, switch atomically, and only then
resume. Do not delete the old key while a process may still hold it.

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
