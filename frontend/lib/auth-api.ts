import { getApiErrorMessage } from "@/lib/api-report";
import { getApiBaseUrl } from "@/lib/env";
import { request } from "@/lib/http";
import type { AuthUser } from "@/lib/auth-types";

// Re-exported for convenience: the session store and the auth form both need
// these exact shapes, and the backend's `UserRole` enum is the source of truth.
export type { AuthUser, UserRole } from "@/lib/auth-types";

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * Auth failures that carry structured field information (issue #1988).
 * `fieldErrors` maps a form field ("email", "password") to the first
 * validation message the backend produced for it; keys are absent when the
 * backend did not attribute the failure to a specific field (401, network
 * downtime, unexpected payloads).
 */
export class AuthApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(
    status: number,
    fieldErrors: Record<string, string>,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const AUTH_FIELDS = ["email", "password"] as const;

/**
 * Maps backend validation output onto form fields. Nest/class-validator
 * validation failures arrive as a 400 whose `message` is an array of strings
 * such as "email must be an email" or "password must be longer than or
 * equal to 8 characters"; each message is matched to the field it names so
 * the form can render it next to the offending input.
 */
function collectFieldErrors(errorBody: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  const message = (errorBody as { message?: unknown } | null)?.message;

  if (Array.isArray(message)) {
    for (const text of message) {
      if (typeof text !== "string") continue;
      const field = AUTH_FIELDS.find((name) =>
        text.toLowerCase().startsWith(name),
      );
      if (field && !fieldErrors[field]) {
        fieldErrors[field] = text;
      }
    }
  }

  return fieldErrors;
}

/**
 * Every request includes `credentials: "include"` (issue #1975): the backend
 * answers register/login with an HttpOnly `accessToken` cookie, so the session
 * is owned by the cookie, not by a JavaScript-readable duplicate. The token
 * returned in the response body is kept in memory only (see session-store).
 */
function authRequest<T>(
  path: string,
  body: { email: string; password: string },
): Promise<T> {
  return request<T>(path, {
    service: "auth",
    method: "POST",
    body,
    // A 401 from login/register means bad credentials, not an expired
    // session - resolving the session and redirecting here would be wrong.
    expireOn401: false,
    makeError: (status, errorBody) => {
      const fallbackMessage =
        status === 401
          ? "Invalid credentials"
          : `Authentication failed (${status})`;
      // Attach per-field validation detail when the backend provided it
      // (issue #1988): 400 field arrays, and 409 for a taken email address.
      const fieldErrors = collectFieldErrors(errorBody);
      if (status === 409 && !fieldErrors.email) {
        fieldErrors.email = getApiErrorMessage(
          errorBody as Record<string, unknown> | null,
          "Email is already registered",
        );
      }
      return new AuthApiError(
        status,
        fieldErrors,
        getApiErrorMessage(
          errorBody as Record<string, unknown> | null,
          fallbackMessage,
        ),
      );
    },
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/login", { email, password });
}

export function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/register", { email, password });
}

/**
 * Returns the signed-in user from the backend (issue #1973). Used to restore
 * a session after a page reload without reading the HttpOnly cookie from
 * JavaScript. Single-flight: concurrent callers share one request.
 */
let meInFlight: Promise<AuthUser> | null = null;

export function me(): Promise<AuthUser> {
  meInFlight ??= fetchMe().finally(() => {
    meInFlight = null;
  });
  return meInFlight;
}

function fetchMe(): Promise<AuthUser> {
  // A 401 here expires the session (handled by request()).
  return request<AuthUser>("/auth/me", {
    service: "auth",
    fallbackMessage: () => "Failed to load the current session",
  });
}

/**
 * Ends the session server-side and clears the HttpOnly cookie (issue #1974).
 * The backend revokes every outstanding token for the user by bumping their
 * `tokenVersion`, so a copied JWT cannot outlive the logout either. Network
 * or 401/403 failures must not block the local sign-out: callers always clear
 * the local session afterwards, which is why errors are swallowed here.
 */
export async function logout(): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // The local session is cleared by the caller regardless.
  }
}
