/**
 * User Types and Authentication Interfaces
 * Defines the core User model and auth-related state interfaces
 */

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface User {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  username?: string | null;
  role: UserRole;
  isActive: boolean;
  isSuspended?: boolean;
  isDeleted?: boolean;
  avatar?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  deletedAt?: string | Date | null;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  tokenExpiresAt: number | null;
  _hasHydrated: boolean;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number; // Token TTL in seconds (optional)
}

export interface SetAuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn?: number; // If provided, calculates tokenExpiresAt automatically
}
