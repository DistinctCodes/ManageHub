# Security Policy

## Supported versions

Security fixes are applied to the latest released contract version and the
`main` branch.

## Reporting a vulnerability (#1881)

Please report suspected vulnerabilities privately:

- Email: security@managehub.example
- Or open a private GitHub security advisory for this repository.

Do **not** open a public issue for a security report.

Please include:

- The contract and entrypoint affected.
- A minimal reproduction or PoC.
- The impact you believe it has (e.g. locked funds, unauthorised release).

### Process

1. We acknowledge the report within 3 working days.
2. We confirm and scope the issue, and agree a disclosure timeline with you.
3. We prepare and release a fix, and credit you (unless you ask otherwise).

## WASM size (#1882)

Contract WASM size is tracked as a CI regression check so a change cannot
silently bloat deployable artifacts.
