# Sentry Error Monitoring Setup

This frontend now includes Sentry error monitoring to capture and report client-side errors during critical user flows (payments, wallet operations, authentication).

## What's Being Monitored

### Error Boundaries
- **Global Error Boundary** (`app/global-error.tsx`): Catches unhandled application-wide errors
- **Wallet Error Boundary** (`app/wallet/error.tsx`): Catches errors specific to wallet operations

### API Errors
All API client errors are reported to Sentry through a shared helper
(`lib/api-report.ts`) used by:
- **Payments API** (`lib/payments-api.ts`): Payment initiation, verification, refunds
- **Wallet API** (`lib/wallet-api.ts`): Wallet provisioning, linking, status checks
- **Auth API** (`lib/auth-api.ts`): Login and registration
- **Admin API** (`lib/admin-api.ts`): Ledger accounts, settlements, revenue splits

Each error includes only non-sensitive metadata:
- HTTP method and API path template (not the full URL with query string)
- HTTP status code
- Request ID (from the `x-request-id`/`request-id` response header, when present)
- Error boundary source (when applicable)
- User environment information

Request and response bodies are **never** attached to Sentry events, since
they can contain plaintext passwords, tokens or wallet signatures.

## Setup Instructions

### 1. Create a Sentry Project
1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project for your Next.js application
3. Copy the DSN (Data Source Name) from your project settings

### 2. Configure Environment Variables
Add your Sentry DSN to `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production  # or development, staging
```

Reference `.env.example` for all required variables.

### 3. Verify Installation
After setting the DSN, Sentry will automatically:
- Initialize on client and server
- Capture unhandled exceptions
- Report API failures with context

## Sampling Defaults (issue #1987)

- **Traces**: `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` defaults to `1.0` in
  development but only `0.1` in production, so one forgotten deployment
  cannot exhaust the quota. Set the variable explicitly to change this
  (values outside [0, 1] fall back to the default). The server and edge
  configs share the same helper (`lib/sentry-sampling.ts`).
- **Session replays are opt-in only**: both
  `NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE` and
  `NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE` default to `0`. Enable
  them explicitly (e.g. `0.1` / `1.0`) if you want recording; the replay
  integration still masks all text and blocks all media whenever it runs.
- **Non-Error rejections** never crash the `beforeSend` hook anymore: thrown
  strings, `undefined` or plain objects are reported as `NonError` events
  with a stringified message instead of being dropped.

## Error Context
Errors are tagged with:
- `errorBoundary`: Which error boundary caught the error (global/wallet)
- `api`: Which API module failed (payments/wallet/auth/admin)
- `statusCode`: HTTP status code (for API errors)

Event `extra` contains only `method`, `pathTemplate`, `statusCode` and
`requestId` for API errors.

## Privacy
- Session replays mask all text and block media by default
- Request and response bodies are never sent to Sentry
- A `beforeSend` scrubber in `sentry.client.config.ts` is a second line of
  defence: it strips request body data and redacts any field whose key looks
  like a password, token, signature, secret, credential, authorization header
  or API key
- No PII is collected unless explicitly added

## Testing
To test Sentry integration:
1. Set a valid DSN in `.env.local`
2. Trigger an error (e.g., by calling an API that will fail)
3. Check your Sentry dashboard for the error report
