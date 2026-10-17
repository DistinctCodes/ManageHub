import { request } from "@/lib/http";

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

async function authRequest<T>(
  path: string,
  body: { email: string; password: string },
): Promise<T> {
  return request<T>(path, {
    service: "auth",
    method: "POST",
    body,
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
