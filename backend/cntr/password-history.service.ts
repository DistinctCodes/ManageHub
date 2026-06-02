import * as bcrypt from 'bcrypt';

export async function isPasswordReused(
  newPassword: string,
  hashedHistory: string[],
): Promise<boolean> {
  for (const hash of hashedHistory) {
    if (await bcrypt.compare(newPassword, hash)) return true;
  }
  return false;
}

export function addToHistory(
  newHash: string,
  history: string[],
  maxHistory = 5,
): string[] {
  return [newHash, ...history].slice(0, maxHistory);
}
