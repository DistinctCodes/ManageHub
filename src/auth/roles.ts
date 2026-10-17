/**
 * Shared role model (#1936) and first-admin bootstrap (#1935).
 *
 * The backend and frontend disagreed on role names. This module is the single
 * source of truth, with an alias mapper so existing values keep working.
 */
export enum Role {
  User = "USER",
  Admin = "ADMIN",
}

const ALIASES: Readonly<Record<string, Role>> = Object.freeze({
  user: Role.User,
  member: Role.User,
  admin: Role.Admin,
});

/** Map a loosely-typed role value to the canonical `Role`, or `null`. */
export function toRole(value: string): Role | null {
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

/**
 * Role granted to the first registered account so an instance can be
 * bootstrapped without a manual database edit (#1935).
 */
export const FIRST_ACCOUNT_ROLE = Role.Admin;
