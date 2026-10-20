import { z } from "zod";

// The development default for the API base URL (port 6100) aligns with the
// backend's configured PORT (see backend/.env.example), so `npm run dev` on
// the frontend reaches a locally running backend with no configuration.
const DEV_API_BASE_URL = "http://localhost:6100";
const FALLBACK_APP_BASE_URL = "https://managehub.app";

/**
 * An absolute http(s) URL, trimmed. Used with safeParse so invalid values are
 * handled as data instead of thrown module-load errors.
 */
const httpUrlSchema = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => /^https?:\/\//i.test(value),
    { message: "must be an absolute http(s) URL" },
  );

// Validation is lazy (called at request/stream time, never at import time) so
// static prerendering and build-time evaluation of client modules stay safe.
function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Base URL used for canonical URLs, robots.txt and the sitemap. Falls back to
 * the production origin when unset or malformed.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return FALLBACK_APP_BASE_URL;
  }
  const parsed = httpUrlSchema.safeParse(raw);
  // A malformed value must never break rendering: fall back instead of throw.
  return parsed.success
    ? stripTrailingSlash(parsed.data)
    : FALLBACK_APP_BASE_URL;
}

/**
 * Backend API base URL used by every API module (auth, admin, payments,
 * wallet, credits).
 *
 * Behaviour:
 * - set to a valid http(s) URL -> returned trimmed, without a trailing slash;
 * - unset/empty in development -> the backend's port 6100 default;
 * - unset/empty in production -> throws so a misconfigured deploy fails
 *   loudly instead of silently requesting against the frontend's own origin;
 * - unset/empty in any other environment (e.g. test) -> the legacy "" value,
 *   which keeps requests relative (unit tests rely on this).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_API_URL is not configured: copy frontend/.env.example to .env.local and set the backend URL (defaults to http://localhost:6100 in development).",
      );
    }
    if (process.env.NODE_ENV === "development") {
      return DEV_API_BASE_URL;
    }
    return "";
  }

  const parsed = httpUrlSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `NEXT_PUBLIC_API_URL is not a valid http(s) URL: got "${raw}". Copy frontend/.env.example to .env.local for the expected format (defaults to http://localhost:6100 in development).`,
    );
  }
  return stripTrailingSlash(parsed.data);
}
