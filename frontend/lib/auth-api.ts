import {
  getApiErrorMessage,
  getRequestId,
  reportApiError,
} from "@/lib/api-report";
import { getApiBaseUrl } from "@/lib/env";
import { expireSession } from "@/lib/session-expiry";
import type { AuthUser } from "@/lib/auth-types";

// Re-exported for convenience: the session store and the auth form both need
// these exact shapes, and the backend's `UserRole` enum is the source of truth.
export type { AuthUser, UserRole } from "@/lib/auth-types";

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/**
 * Every request includes `credentials: "include"` (issue #1975): the backend
 * answers register/login with an HttpOnly `accessToken` cookie, so the session
 * is owned by the cookie, not by a JavaScript-readable duplicate. The token
 * returned in the response body is kept in memory only (see session-store).
 */
async function authRequest<T>(
  path: string,
  body: { email: string; password: string },
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });

  if (!response.ok) {
    // A 401 from login/register means bad credentials, not an expired
    // session - resolving the session and redirecting here would be wrong.
    const errorBody = await response.json().catch(() => null);
    const fallbackMessage =
      response.status === 401
        ? "Invalid credentials"
        : `Authentication failed (${response.status})`;
    const error = new Error(getApiErrorMessage(errorBody, fallbackMessage));

    reportApiError({
      api: "auth",
      method: "POST",
      pathTemplate: path,
      status: response.status,
      requestId: getRequestId(response),
    });

    throw error;
  }

  return response.json() as Promise<T>;
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

async function fetchMe(): Promise<AuthUser> {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      // A rejected session must clear the store and send the user to login
      // instead of leaving a stale state behind (issue #1977).
      expireSession();
    }
    const errorBody = await response.json().catch(() => null);
    const error = new Error(
      getApiErrorMessage(errorBody, "Failed to load the current session"),
    );

    reportApiError({
      api: "auth",
      method: "GET",
      pathTemplate: "/auth/me",
      status: response.status,
      requestId: getRequestId(response),
    });

    throw error;
  }

  return (await response.json()) as AuthUser;
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
