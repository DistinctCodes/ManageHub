import { mapSorobanError } from './soroban-error-mapping';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import {
  EscrowSubmissionError,
  SimulationFailedError,
} from './escrow-contract.client';

describe('mapSorobanError', () => {
  it('treats an "already released" guard as success, not a failure', () => {
    expect(mapSorobanError(new Error('escrow already released'))).toEqual({
      alreadySucceeded: true,
      reason: null,
    });
  });

  it('treats an "already refunded" guard as success, not a failure', () => {
    expect(mapSorobanError(new Error('Error: already_refunded'))).toEqual({
      alreadySucceeded: true,
      reason: null,
    });
  });

  it('maps a simulation failure to SIMULATION_FAILED', () => {
    expect(mapSorobanError(new SimulationFailedError('boom'))).toEqual({
      alreadySucceeded: false,
      reason: PaymentFailureReason.SIMULATION_FAILED,
    });
  });

  it('maps a sequence-number conflict to SEQUENCE_CONFLICT', () => {
    expect(mapSorobanError(new Error('txBAD_SEQ'))).toEqual({
      alreadySucceeded: false,
      reason: PaymentFailureReason.SEQUENCE_CONFLICT,
    });
  });

  it('maps an underpriced fee to INSUFFICIENT_FEE', () => {
    expect(mapSorobanError(new Error('txINSUFFICIENT_FEE'))).toEqual({
      alreadySucceeded: false,
      reason: PaymentFailureReason.INSUFFICIENT_FEE,
    });
  });

  it('maps an expired transaction to TRANSACTION_EXPIRED', () => {
    expect(mapSorobanError(new Error('txTOO_LATE: expired'))).toEqual({
      alreadySucceeded: false,
      reason: PaymentFailureReason.TRANSACTION_EXPIRED,
    });
  });

  it('maps a generic on-chain submission rejection to CONTRACT_REVERTED', () => {
    expect(
      mapSorobanError(new EscrowSubmissionError('{"code":"txFAILED"}')),
    ).toEqual({
      alreadySucceeded: false,
      reason: PaymentFailureReason.CONTRACT_REVERTED,
    });
  });

  it('treats an unrecognized error as indeterminate, never a definite failure', () => {
    expect(mapSorobanError(new Error('ECONNRESET'))).toEqual({
      alreadySucceeded: false,
      reason: null,
    });
  });

  it('treats a plain timeout as indeterminate', () => {
    expect(mapSorobanError(new Error('Request timed out'))).toEqual({
      alreadySucceeded: false,
      reason: null,
    });
  });
});
