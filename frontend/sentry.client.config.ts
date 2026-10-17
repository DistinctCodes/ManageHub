import * as Sentry from "@sentry/nextjs";
import {
  defaultTracesSampleRate,
  getSampleRate,
} from "@/lib/sentry-sampling";

// Re-exported so tooling and tests can treat this config as the single entry
// point for the client sampling behavior.
export { defaultTracesSampleRate, getSampleRate };

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

/**
 * Describes the original exception for the event's `contexts.error` without
 * assuming it is an `Error` (issue #1987): rejected strings, `undefined`,
 * thrown objects that are not Errors or promise rejection reasons arrived at
 * the old cast and crashed this hook, silently dropping the whole event.
 * Anything that is not a real Error is labelled `NonError` and stringified as
 * safely as possible - it must never throw here.
 */
export function describeException(original: unknown): {
  name: string;
  message: string;
  stack?: string;
} {
  if (original instanceof Error) {
    return {
      name: original.name,
      message: original.message,
      stack: original.stack,
    };
  }
  if (typeof original === "string") {
    return { name: "NonError", message: original };
  }
  try {
    return { name: "NonError", message: JSON.stringify(original) ?? "" };
  } catch {
    return { name: "NonError", message: String(original) };
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    defaultTracesSampleRate(),
  ),
  // Replays are opt-in only (issue #1987): no env var, no replay. Recording
  // every session by default is a privacy and quota decision that belongs to
  // the people deploying the app, not the default configuration.
  replaysSessionSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    0,
  ),
  replaysOnErrorSampleRate: getSampleRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
    0,
  ),
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    if (event.exception) {
      const original =
        hint && typeof hint === "object" ? hint.originalException : undefined;
      event.contexts = {
        ...event.contexts,
        error: describeException(original),
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
