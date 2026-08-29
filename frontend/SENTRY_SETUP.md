# Sentry Error Monitoring Setup

This frontend now includes Sentry error monitoring to capture and report client-side errors during critical user flows (payments, wallet operations, authentication).

## What's Being Monitored

### Error Boundaries
- **Global Error Boundary** (`app/global-error.tsx`): Catches unhandled application-wide errors
- **Wallet Error Boundary** (`app/wallet/error.tsx`): Catches errors specific to wallet operations

### API Errors
All API client errors are now reported to Sentry with contextual information:
- **Payments API** (`lib/payments-api.ts`): Payment initiation, verification, refunds
- **Wallet API** (`lib/wallet-api.ts`): Wallet provisioning, linking, status checks
- **Auth API** (`lib/auth-api.ts`): Login and registration
- **Admin API** (`lib/admin-api.ts`): Ledger accounts, settlements, revenue splits

Each error includes:
- API endpoint and HTTP status code
- Request/response context (sanitized)
- Error boundary source (when applicable)
- User environment information

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
- Record session replays for errors
- Report API failures with context

## Error Context
Errors are tagged with:
- `errorBoundary`: Which error boundary caught the error (global/wallet)
- `api`: Which API module failed (payments/wallet/auth/admin)
- `endpoint`: The specific API endpoint
- `statusCode`: HTTP status code (for API errors)

## Privacy
- Session replays mask all text and block media by default
- Sensitive request/response data is only sent when an error occurs
- No PII is collected unless explicitly added

## Testing
To test Sentry integration:
1. Set a valid DSN in `.env.local`
2. Trigger an error (e.g., by calling an API that will fail)
3. Check your Sentry dashboard for the error report
