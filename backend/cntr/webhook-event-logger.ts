import { randomUUID } from 'crypto';

export interface WebhookEventLog {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  error?: string;
  receivedAt: string;
}

const SENSITIVE_KEY_REGEX = /(card|cvv|pan|account_number)/i;

function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!SENSITIVE_KEY_REGEX.test(key)) {
      result[key] = value;
    }
  }
  return result;
}

export function createWebhookEventLog(
  event: string,
  payload: Record<string, unknown>,
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED',
  error?: string,
): WebhookEventLog {
  const log: WebhookEventLog = {
    id: randomUUID(),
    event,
    payload: sanitizePayload(payload),
    status,
    receivedAt: new Date().toISOString(),
  };
  if (error !== undefined) {
    log.error = error;
  }
  return log;
}
