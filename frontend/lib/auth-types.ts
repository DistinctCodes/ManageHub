/**
 * Shared auth types for the frontend.
 *
 * Mirrors the backend `UserRole` enum values (issue #1973): the backend signs
 * the role as a lowercase string claim ("user" | "admin"), so the previous
 * "MEMBER" | "ADMIN" | "SUPER_ADMIN" union never matched real tokens.
 */
export type UserRole = "user" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
