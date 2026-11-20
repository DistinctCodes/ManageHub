import { mapSorobanError } from './soroban-error-mapping';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';
import {
  ContractError,
  EscrowSubmissionError,
  SimulationFailedError,
} from './escrow-contract.client';

describe('mapSorobanError', () => {
  it.each([
    [ContractError.NotFound, 'terminal'],
    [ContractError.AlreadyResolved, 'already-succeeded'],
    [ContractError.InvalidAmount, 'terminal'],
    [ContractError.AlreadyExists, 'retry'],
    [ContractError.ArithmeticOverflow, 'manual-review'],
    [ContractError.AlreadyReleased, 'already-succeeded'],
    [ContractError.AlreadyRefunded, 'already-succeeded'],
    [ContractError.AlreadyInitialized, 'manual-review'],
    [ContractError.NotInitialized, 'manual-review'],
    [ContractError.Unauthorized, 'manual-review'],
    [ContractError.Paused, 'retry'],
    [ContractError.NoPendingAdmin, 'terminal'],
    [ContractError.AmountExceedsEscrow, 'manual-review'],
    [ContractError.NothingToRefund, 'terminal'],
    [ContractError.TokenNotAllowed, 'manual-review'],
    [ContractError.TransferShortfall, 'manual-review'],
  ] as const)('maps contract error code %i to %s', (code, disposition) => {
    expect(
      mapSorobanError(new Error(`Error(Contract, #${code})`)),
    ).toMatchObject({
      disposition,
      alreadySucceeded: disposition === 'already-succeeded',
    });
  });

  it('treats an "already released" guard as success, not a failure', () => {
    expect(mapSorobanError(new Error('escrow already released'))).toEqual({
      alreadySucceeded: true,
      disposition: 'already-succeeded',
      reason: null,
    });
  });

  it('treats an "already refunded" guard as success, not a failure', () => {
    expect(mapSorobanError(new Error('Error: already_refunded'))).toEqual({
      alreadySucceeded: true,
      disposition: 'already-succeeded',
      reason: null,
    });
  });

  it('maps a simulation failure to SIMULATION_FAILED', () => {
    expect(mapSorobanError(new SimulationFailedError('boom'))).toEqual({
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.SIMULATION_FAILED,
    });
  });

  it('maps a sequence-number conflict to SEQUENCE_CONFLICT', () => {
    expect(mapSorobanError(new Error('txBAD_SEQ'))).toEqual({
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.SEQUENCE_CONFLICT,
    });
  });

  it('maps an underpriced fee to INSUFFICIENT_FEE', () => {
    expect(mapSorobanError(new Error('txINSUFFICIENT_FEE'))).toEqual({
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.INSUFFICIENT_FEE,
    });
  });

  it('maps an expired transaction to TRANSACTION_EXPIRED', () => {
    expect(mapSorobanError(new Error('txTOO_LATE: expired'))).toEqual({
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.TRANSACTION_EXPIRED,
    });
  });

  it('maps a generic on-chain submission rejection to CONTRACT_REVERTED', () => {
    expect(
      mapSorobanError(new EscrowSubmissionError('{"code":"txFAILED"}')),
    ).toEqual({
      alreadySucceeded: false,
      disposition: 'terminal',
      reason: PaymentFailureReason.CONTRACT_REVERTED,
    });
  });

  it('treats an unrecognized error as indeterminate, never a definite failure', () => {
    expect(mapSorobanError(new Error('ECONNRESET'))).toEqual({
      alreadySucceeded: false,
      disposition: 'indeterminate',
      reason: null,
    });
  });

  it('treats a plain timeout as indeterminate', () => {
    expect(mapSorobanError(new Error('Request timed out'))).toEqual({
      alreadySucceeded: false,
      disposition: 'indeterminate',
      reason: null,
    });
  });
});
