import * as Sentry from "@sentry/nextjs";
import {
  defaultTracesSampleRate,
  getSampleRate,
} from "@/lib/sentry-sampling";

// Kept consistent with sentry.client.config.ts (issue #1987): 100% in
// development, 10% in production unless explicitly configured.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    defaultTracesSampleRate(),
  ),
});
