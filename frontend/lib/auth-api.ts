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
    fallbackMessage: (status) =>
      status === 401
        ? "Invalid credentials"
        : `Authentication failed (${status})`,
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
