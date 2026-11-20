import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import {
  ContractError,
  EscrowSubmissionError,
  SimulationFailedError,
} from './escrow-contract.client';

export type SorobanErrorDisposition =
  | 'already-succeeded'
  | 'retry'
  | 'terminal'
  | 'manual-review'
  | 'indeterminate';

export interface SorobanErrorMapping {
  /**
   * True when what looks like a failure is actually the contract's own
   * "already done" guard (issue #1574's retried-release edge case) —
   * must be treated as success, not an error.
   */
  alreadySucceeded: boolean;
  disposition: SorobanErrorDisposition;
  /** Null means the contract error should not immediately fail the payment. */
  reason: PaymentFailureReason | null;
}

const CONTRACT_ERROR_DISPOSITIONS: Record<
  ContractError,
  Exclude<SorobanErrorDisposition, 'indeterminate'>
> = {
  [ContractError.NotFound]: 'terminal',
  [ContractError.AlreadyResolved]: 'already-succeeded',
  [ContractError.InvalidAmount]: 'terminal',
  [ContractError.AlreadyExists]: 'retry',
  [ContractError.ArithmeticOverflow]: 'manual-review',
  [ContractError.AlreadyReleased]: 'already-succeeded',
  [ContractError.AlreadyRefunded]: 'already-succeeded',
  [ContractError.AlreadyInitialized]: 'manual-review',
  [ContractError.NotInitialized]: 'manual-review',
  [ContractError.Unauthorized]: 'manual-review',
  [ContractError.Paused]: 'retry',
  [ContractError.NoPendingAdmin]: 'terminal',
  [ContractError.AmountExceedsEscrow]: 'manual-review',
  [ContractError.NothingToRefund]: 'terminal',
  [ContractError.TokenNotAllowed]: 'manual-review',
  [ContractError.TransferShortfall]: 'manual-review',
};

function mapContractError(code: number): SorobanErrorMapping | undefined {
  if (!Object.values(ContractError).includes(code)) {
    return undefined;
  }
  const disposition = CONTRACT_ERROR_DISPOSITIONS[code as ContractError];
  return {
    alreadySucceeded: disposition === 'already-succeeded',
    disposition,
    reason:
      disposition === 'terminal'
        ? PaymentFailureReason.CONTRACT_REVERTED
        : null,
  };
}

/**
 * Maps a Soroban submission/simulation error to the failure taxonomy
 * (issue #1574, feeding #1572's pattern).
 */
export function mapSorobanError(error: unknown): SorobanErrorMapping {
  const message = error instanceof Error ? error.message : String(error);

  if (/already[_ ]?(released|refunded|resolved)/i.test(message)) {
    return {
      alreadySucceeded: true,
      disposition: 'already-succeeded',
      reason: null,
    };
  }

  const contractErrorMatch = message.match(/Error\([^,]+,\s*#(\d+)\)/i);
  if (contractErrorMatch) {
    const mapping = mapContractError(Number(contractErrorMatch[1]));
    if (mapping) {
      return mapping;
    }
  }

  if (error instanceof SimulationFailedError) {
    return {
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.SIMULATION_FAILED,
    };
  }
  if (/bad_seq|sequence/i.test(message)) {
    return {
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.SEQUENCE_CONFLICT,
    };
  }
  if (/insufficient.*fee|underpriced|txINSUFFICIENT_FEE/i.test(message)) {
    return {
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.INSUFFICIENT_FEE,
    };
  }
  if (/expired|too_late|txTOO_LATE/i.test(message)) {
    return {
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.TRANSACTION_EXPIRED,
    };
  }
  if (error instanceof EscrowSubmissionError || /contract/i.test(message)) {
    return {
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.CONTRACT_REVERTED,
    };
  }

  // Unrecognized — most likely a network/timeout/RPC-unreachable error,
  // not a definite on-chain verdict. Never map this to a failure reason.
  return {
    alreadySucceeded: false,
    disposition: 'indeterminate',
    reason: null,
  };
}
