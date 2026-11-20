/** #2102: shared password policy (min 8 chars, max 72 bytes for bcrypt). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export function passwordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return `Password must be at most ${PASSWORD_MAX_BYTES} bytes`;
  return null;
}

/** #2103: a user is suspended when isActive is explicitly false. */
export function isUserSuspended(user: { isActive?: boolean | null }): boolean {
  return user.isActive === false;
}
