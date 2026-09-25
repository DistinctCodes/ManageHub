# wallets/key-custody threat model

The custodial key-handling code in this module is one of the highest-value
attack surfaces in the service. This document is a starting threat model.

## Key storage

Custodial private keys must be encrypted at rest with a key-encryption-key
(KEK) that itself never lives alongside the encrypted key material. The KEK
should be held in a dedicated secrets manager / HSM, not application config.

## Access control

Only the wallet-linking and payout-signing code paths should be able to
request key material, and only for the specific wallet they're operating
on. No endpoint should return raw key material to a client.

## Rotation

Keys should be rotatable without wallet downtime: generate a new key,
re-encrypt/re-link, then retire the old key. See the separate rotation
endpoint work (issue #1758).

## Compromise response

If a key is suspected compromised: freeze outbound transfers from the
affected wallet immediately, rotate the key, and audit recent transactions
via admin-audit for unauthorized activity before unfreezing.

## Open questions

This is a starting document, not an exhaustive audit — a full review
should also cover backup/recovery procedures and multi-party signing.
