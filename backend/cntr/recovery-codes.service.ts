import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => {
    const bytes = randomBytes(10);
    return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  });
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

export async function verifyRecoveryCode(
  plain: string,
  hashedCodes: string[],
): Promise<{ matched: boolean; index: number }> {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(plain, hashedCodes[i])) {
      return { matched: true, index: i };
    }
  }
  return { matched: false, index: -1 };
}
