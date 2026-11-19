export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

export interface PasswordStrength {
  score: number;
  label: string;
}

const STRENGTH_LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const capped = Math.min(score, 4);
  return { score: capped, label: STRENGTH_LABELS[capped] };
}
