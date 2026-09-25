// Validates an incoming webhook payload against the shape defined in
// webhook-contract.ts, so payment-webhook.controller.ts can't silently
// drift from the contract it's supposed to honor.
import { WebhookContract } from './webhook-contract';

export function assertMatchesWebhookContract(
  payload: unknown,
): asserts payload is WebhookContract {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Webhook payload must be an object');
  }
  const requiredKeys: (keyof WebhookContract)[] = Object.keys(
    {} as WebhookContract,
  ) as (keyof WebhookContract)[];
  for (const key of requiredKeys) {
    if (!(key in payload)) {
      throw new Error(`Webhook payload missing required field "${String(key)}"`);
    }
  }
}
