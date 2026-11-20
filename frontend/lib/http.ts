import {
  getApiErrorMessage,
  getRequestId,
  reportApiError,
} from "@/lib/api-report";
import { getApiBaseUrl } from "@/lib/env";
import {
  isRateLimited,
  parseRetryAfter,
  rateLimitMessage,
} from "@/lib/rateLimitFeedback";
import { expireSession } from "@/lib/session-expiry";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Shared Sentry-facing api names for every backend client module.
export type ApiService =
  | "auth"
  | "admin"
  | "payments"
  | "wallet"
  | "credits"
  | "currencies";

export interface RequestOptions {
  method?: string;
  /**
   * JSON body (object/array); it is serialized here. A string is assumed to
   * be already-serialized JSON and is sent as-is.
   */
  body?: unknown;
  idempotencyKey?: string;
  /** Api name used as the "api" tag for Sentry error reporting. */
  service: ApiService;
  /**
   * Payments-style retry: one extra attempt for idempotent methods
   * (GET/HEAD) on network errors or transient status codes.
   */
  retriable?: boolean;
  /** Builds the message for typed fallbacks keyed by status. */
  fallbackMessage?: (status: number) => string;
  /** Builds a module-specific typed error (e.g. CreditsApiError). */
  makeError?: (status: number, body: unknown) => Error;
  /** Default true; set false for modules that do not report (credits). */
  report?: boolean;
  /**
   * Default true: a 401 means the HttpOnly session cookie was rejected, so the
   * user is sent to login (issue #1977). Set false for login/register, where
   * a 401 just means bad credentials.
   */
  expireOn401?: boolean;
  /** Default "include" so the HttpOnly session cookie is sent cross-origin. */
  credentials?: RequestCredentials;
  /** Abort the request after this many milliseconds (default 15000). */
  timeoutMs?: number;
}

const TRANSIENT_RETRY_DELAY_MS = 250;
const DEFAULT_TIMEOUT_MS = 15_000;
// 429 is handled by rate-limit UX and is not auto-retried (#2208).
const RETRYABLE_STATUS_CODES = new Set([408, 425, 500, 502, 503, 504]);

function isRetryableMethod(init: RequestInit): boolean {
  return (init.method ?? "GET").toUpperCase() === "GET";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function waitForRetry(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError(0, "TIMEOUT", "Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retriable: boolean,
  timeoutMs: number,
): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);
      if (
        !retriable ||
        attempt >= 1 ||
        !RETRYABLE_STATUS_CODES.has(response.status)
      ) {
        return response;
      }
      await response.body?.cancel();
    } catch (error) {
      const timeout = error instanceof ApiError && error.code === "TIMEOUT";
      if (!retriable || attempt >= 1 || (isAbortError(error) && !timeout)) {
        throw error;
      }
    }

    await waitForRetry();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Error message resolution: a non-empty string message wins, then a message
 * array (its string entries joined with spaces), otherwise null so callers
 * can fall back to their own default message.
 */
function extractMessage(body: unknown): string | null {
  if (isRecord(body) && Array.isArray(body.message)) {
    const parts = body.message.filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0,
    );
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }
  const message = getApiErrorMessage(isRecord(body) ? body : null, "");
  return message.length > 0 ? message : null;
}

function extractErrorCode(body: unknown): string | null {
  if (isRecord(body) && typeof body.code === "string") {
    return body.code;
  }
  return null;
}

export async function request<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const {
    method,
    body,
    idempotencyKey,
    service,
    retriable = false,
    fallbackMessage,
    makeError,
    report = true,
    expireOn401 = true,
    credentials = "include",
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const init: RequestInit = {
    ...(method ? { method } : {}),
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials,
  };

  const response = await fetchWithRetry(
    `${getApiBaseUrl()}${path}`,
    init,
    retriable && isRetryableMethod(init),
    timeoutMs,
  );

  if (!response.ok) {
    if (response.status === 401 && expireOn401) {
      // A rejected session must send the user to login, not leave the stale
      // state in place (issue #1977).
      expireSession();
    }
    const payload: unknown = await response.json().catch(() => null);
    const rateLimited = isRateLimited(response.status);
    const retryAfter = rateLimited
      ? parseRetryAfter(response.headers.get("Retry-After"))
      : undefined;
    const limitMessage = rateLimited ? rateLimitMessage(retryAfter) : null;

    let error: Error;
    if (makeError) {
      // Typed-error modules (e.g. CreditsApiError) own their message and
      // fallback handling for every error body.
      error = makeError(response.status, payload);
      if (limitMessage) error.message = limitMessage;
    } else {
      const message =
        limitMessage ??
        extractMessage(payload) ??
        fallbackMessage?.(response.status) ??
        `Request failed (${response.status})`;
      error = new ApiError(
        response.status,
        extractErrorCode(payload),
        message,
      );
    }

    if (report !== false) {
      reportApiError({
        api: service,
        method: init.method ?? "GET",
        pathTemplate: path,
        status: response.status,
        requestId: getRequestId(response),
      });
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
