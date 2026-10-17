import * as Sentry from "@sentry/nextjs";

export function getSampleRate(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

// Keys whose values must never be sent to Sentry.
const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|signature|authorization|credential|api[-_]?key|private[-_]?key/i;

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value && typeof value === "object") {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      scrubbed[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[Redacted]"
        : scrubValue(entry);
    }
    return scrubbed;
  }
  return value;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    1.0,
  ),
  replaysSessionSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    0.1,
  ),
  replaysOnErrorSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    1.0,
  ),
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    if (event.exception) {
      const error = hint.originalException as Error;
      event.contexts = {
        ...event.contexts,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack,
        },
      };
    }
    // Second line of defence: never ship request bodies, and redact any
    // sensitive fields (passwords, tokens, signatures, secrets) that may
    // have leaked into extra, contexts or request headers.
    if (event.request) {
      delete event.request.data;
      if (event.request.headers) {
        event.request.headers = scrubValue(
          event.request.headers,
        ) as Record<string, string>;
      }
    }
    if (event.extra) {
      event.extra = scrubValue(event.extra) as typeof event.extra;
    }
    if (event.contexts) {
      event.contexts = scrubValue(event.contexts) as typeof event.contexts;
    }
    return event;
  },
});
