import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

export function encryptApiKey(plaintext: string, hexKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(hexKey, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptApiKey(ciphertext: string, hexKey: string): string {
  const [ivHex, encHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(hexKey, 'hex'), iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function isEncrypted(value: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}
