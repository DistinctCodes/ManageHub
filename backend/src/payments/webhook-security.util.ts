import { createHmac, timingSafeEqual } from 'crypto';

/** #2093: the signed payload covers the event id as well as the body. */
export function signWebhook(secret: string, eventId: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${eventId}.${rawBody}`).digest('hex');
}

export function verifyWebhook(secret: string, eventId: string, rawBody: string, signature: string): boolean {
  const a = Buffer.from(signWebhook(secret, eventId, rawBody));
  const b = Buffer.from(signature ?? '');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** #2091: only signature-valid events may be written to the dead-letter table. */
export const shouldDeadLetter = (signatureValid: boolean) => signatureValid;

/** #2092: mark an event as seen only after processing succeeds, so retries still run. */
export async function processThenMarkSeen(process: () => Promise<void>, markSeen: () => Promise<void>) {
  await process();
  await markSeen();
}
