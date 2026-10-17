import {
  getApiErrorMessage,
  getRequestId,
  reportApiError,
} from "@/lib/api-report";

export type UserRole = "MEMBER" | "ADMIN" | "SUPER_ADMIN";

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
