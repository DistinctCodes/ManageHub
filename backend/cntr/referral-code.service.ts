import { createHash } from 'crypto';

export function generateReferralCode(userId: string): string {
  return createHash('sha256').update(userId).digest('hex').toUpperCase().slice(0, 8);
}

export function isValidReferralCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
