/**
 * User Types and Authentication Interfaces
 * Defines the core User model and auth-related state interfaces
 */

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

/**
 * Core User interface
 * Represents authenticated user data
 */
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

/**
 * Authentication State
 * Tracks all auth-related state in Zustand store
 */
export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  tokenExpiresAt: number | null;
  _hasHydrated: boolean;
}

/**
 * Authentication Response from API
 * Expected shape from login/register endpoints
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number; // Token TTL in seconds (optional)
}

/**
 * SetAuth Action Payload
 * Data structure for updating auth state
 */
export interface SetAuthPayload {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn?: number; // If provided, calculates tokenExpiresAt automatically
}
