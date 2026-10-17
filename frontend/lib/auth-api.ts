import {
  getApiErrorMessage,
  getRequestId,
  reportApiError,
} from "@/lib/api-report";

export type UserRole = "MEMBER" | "ADMIN" | "SUPER_ADMIN";

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

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function authRequest<T>(
  path: string,
  body: { email: string; password: string },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const fallbackMessage =
      response.status === 401
        ? "Invalid credentials"
        : `Authentication failed (${response.status})`;

    reportApiError({
      api: "auth",
      method: "POST",
      pathTemplate: path,
      status: response.status,
      requestId: getRequestId(response),
    });

    // Attach per-field validation detail when the backend provided it
    // (issue #1988): 400 field arrays, and 409 for a taken email address.
    const fieldErrors = collectFieldErrors(errorBody);
    if (response.status === 409 && !fieldErrors.email) {
      fieldErrors.email = getApiErrorMessage(
        errorBody,
        "Email is already registered",
      );
    }

    throw new AuthApiError(
      response.status,
      fieldErrors,
      getApiErrorMessage(errorBody, fallbackMessage),
    );
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
