// Validates an incoming webhook payload against the shape defined in
// webhook-contract.ts, so payment-webhook.controller.ts can't silently
// drift from the contract it's supposed to honor.
import { WebhookPayload } from './interfaces/payment-rail-adapter.interface';

const REQUIRED_WEBHOOK_KEYS: ReadonlyArray<keyof WebhookPayload> = [
  'providerReference',
  'outcome',
];

export function assertMatchesWebhookContract(
  payload: unknown,
): asserts payload is WebhookPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Webhook payload must be an object');
  }
  for (const key of REQUIRED_WEBHOOK_KEYS) {
    if (!(key in payload)) {
      throw new Error(`Webhook payload missing required field "${String(key)}"`);
    }
  }
}
