
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

Copy `frontend/.env.example` to `frontend/.env.local` and adjust the values
for your environment. Documented variables include:

- `NEXT_PUBLIC_API_URL` - base URL of the backend API. In development the app
  defaults to `http://localhost:6100` (the backend's configured port); in
  production this variable is **required** and the build fails fast at request
  time when it is missing.
- `NEXT_PUBLIC_APP_URL` - canonical origin of this frontend (defaults to
  `https://managehub.app`).
- `NEXT_PUBLIC_SENTRY_*`, `NEXT_PUBLIC_GOOGLE_VERIFICATION` - optional
  observability and search-console settings.
- `JWT_SECRET` (server-only) - used by `middleware.ts` to verify the session
  cookie.

## Frontend foundations

- Visit `/components` for the shared component catalog.
- Run `npm run build:analyze` to opt into the Next bundle analyzer. The analyzer
  is disabled for normal development and builds.
- PWA metadata is exposed through `/manifest.webmanifest`; update
  `app/manifest.ts` when icons or install behavior change.
- Sentry error monitoring (what is reported, how to configure the DSN and
  sample rates, and what is scrubbed before sending) is documented in
  [SENTRY_SETUP.md](./SENTRY_SETUP.md).
- A baseline Content-Security-Policy and related security headers are applied
  to every route from `lib/csp.ts`. If you add a third-party script, font or
  API origin, allow it there or the browser will block it.

## Running Tests

### Unit and Component Tests (Vitest + React Testing Library)

- **Run unit & component tests once:**
  ```bash
  npm test
  ```

- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

- **Run tests with coverage reporting:**
  ```bash
  npm run test:cov
  ```

### End-to-End Tests (Playwright)

- **Run E2E tests:**
  ```bash
  npm run test:e2e
  ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
