import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import {
  EscrowSubmissionError,
  SimulationFailedError,
} from './escrow-contract.client';

export interface SorobanErrorMapping {
  /**
   * True when what looks like a failure is actually the contract's own
   * "already done" guard (issue #1574's retried-release edge case) —
   * must be treated as success, not an error.
   */
  alreadySucceeded: boolean;
  /**
   * Null means "indeterminate" (network error, RPC unreachable, timeout)
   * — NOT a definite on-chain rejection. The caller must never fail a
   * Payment on a null reason; the chain must be asked again later.
   */
  reason: PaymentFailureReason | null;
}

/**
 * Maps a Soroban submission/simulation error to the failure taxonomy
 * (issue #1574, feeding #1572's pattern). Pattern-matches on the error
 * message because we don't have a live contract's exact error codes to
 * match against structurally — once one exists, replace the regexes below
 * with the contract's real typed error enum.
 */
export function mapSorobanError(error: unknown): SorobanErrorMapping {
  const message = error instanceof Error ? error.message : String(error);

  if (/already[_ ]?(released|refunded)/i.test(message)) {
    return { alreadySucceeded: true, reason: null };
  }
  if (error instanceof SimulationFailedError) {
    return {
      alreadySucceeded: false,
      reason: PaymentFailureReason.SIMULATION_FAILED,
    };
  }
  if (/bad_seq|sequence/i.test(message)) {
    return {
      alreadySucceeded: false,
      reason: PaymentFailureReason.SEQUENCE_CONFLICT,
    };
  }
  if (/insufficient.*fee|underpriced|txINSUFFICIENT_FEE/i.test(message)) {
    return {
      alreadySucceeded: false,
      reason: PaymentFailureReason.INSUFFICIENT_FEE,
    };
  }
  if (/expired|too_late|txTOO_LATE/i.test(message)) {
    return {
      alreadySucceeded: false,
      reason: PaymentFailureReason.TRANSACTION_EXPIRED,
    };
  }
  if (error instanceof EscrowSubmissionError || /contract/i.test(message)) {
    return {
      alreadySucceeded: false,
      reason: PaymentFailureReason.CONTRACT_REVERTED,
    };
  }

  // Unrecognized — most likely a network/timeout/RPC-unreachable error,
  // not a definite on-chain verdict. Never map this to a failure reason.
  return { alreadySucceeded: false, reason: null };
}
