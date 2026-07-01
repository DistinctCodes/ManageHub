/* eslint-disable @typescript-eslint/no-explicit-any */
import { scValToNative } from '@stellar/stellar-sdk';

export function mapScValToescrow(scVal: any): any {
  const escrowMap = scVal.map();
  const escrow: any = {};
  for (const entry of escrowMap) {
    const key = entry.key().sym().toString();
    const value = entry.val();
    escrow[key] = scValToNative(value);
  }
  return escrow;
}

export function mapScValToescrowStatus(scVal: any): string {
  const statusSymbol = scVal.sym().toString();
  switch (statusSymbol) {
    case 'pending':
      return 'Pending';
    case 'released':
      return 'Released';
    case 'refunded':
      return 'Refunded';
    case 'disputed':
      return 'Disputed';
    default:
      return 'Unknown';
  }
}