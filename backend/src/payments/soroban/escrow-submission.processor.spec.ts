import { Keypair } from '@stellar/stellar-sdk';
import { EscrowSubmissionProcessor } from './escrow-submission.processor';
import { EscrowStatus } from './escrow-status.enum';
import { deriveEscrowId } from './escrow-id';
import { Payment } from '../entities/payment.entity';
import { PaymentRail } from '../enums/payment-rail.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentFailureReason } from '../enums/payment-failure-reason.enum';

const TREASURY = Keypair.random();
const PAYER_WALLET = Keypair.random().publicKey();

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 1000,
    currency: 'USD',
    rail: PaymentRail.STELLAR_CUSTODIAL,
    provider: null,
    providerReference: deriveEscrowId('payment-1').toString('hex'),
    status: PaymentStatus.AWAITING_CONFIRMATION,
    idempotencyKey: 'key-1',
    metadata: null,
    expiresAt: null,
    failureReason: null,
    reconciliationAttempts: 0,
    providerErrorStreak: 0,
    lastReconciledAt: null,
    manualReviewReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Payment;
}

function makeTx() {
  return {
    hash: jest.fn().mockReturnValue(Buffer.from('txhash')),
    signatures: [] as unknown[],
    sign: jest.fn(),
  };
}

describe('EscrowSubmissionProcessor', () => {
  let paymentRepository: { findOne: jest.Mock; update: jest.Mock };
  let contractClient: {
    buildCreateTx: jest.Mock;
    buildReleaseTx: jest.Mock;
    buildRefundTx: jest.Mock;
    submit: jest.Mock;
    pollFinality: jest.Mock;
    getEscrowStatus: jest.Mock;
  };
  let walletsService: { getWalletStatus: jest.Mock; signPayload: jest.Mock };
  let confirmationService: { apply: jest.Mock };
  let sorobanConfig: {
    beneficiaryAddress: string;
    treasuryPublicKey: string;
    treasurySecretKey: string;
  };
  let config: { get: jest.Mock };
  let processor: EscrowSubmissionProcessor;

  beforeEach(() => {
    paymentRepository = { findOne: jest.fn(), update: jest.fn() };
    contractClient = {
      buildCreateTx: jest.fn().mockResolvedValue(makeTx()),
      buildReleaseTx: jest.fn().mockResolvedValue(makeTx()),
      buildRefundTx: jest.fn().mockResolvedValue(makeTx()),
      submit: jest.fn().mockResolvedValue({ hash: 'tx-hash-1' }),
      pollFinality: jest.fn().mockResolvedValue('SUCCESS'),
      getEscrowStatus: jest.fn().mockResolvedValue(EscrowStatus.LOCKED),
    };
    walletsService = {
      getWalletStatus: jest
        .fn()
        .mockResolvedValue({ account: { address: PAYER_WALLET } }),
      signPayload: jest.fn().mockResolvedValue(Buffer.alloc(64, 1)),
    };
    confirmationService = {
      apply: jest.fn().mockResolvedValue({ status: PaymentStatus.CONFIRMED }),
    };
    sorobanConfig = {
      beneficiaryAddress: Keypair.random().publicKey(),
      treasuryPublicKey: TREASURY.publicKey(),
      treasurySecretKey: TREASURY.secret(),
    };
    config = { get: jest.fn((_key: string, fallback: number) => fallback) };

    processor = new EscrowSubmissionProcessor(
      paymentRepository as any,
      contractClient as any,
      sorobanConfig as any,
      walletsService as any,
      confirmationService as any,
      config as any,
    );
  });

  function submitJob(data: any) {
    return processor.handleSubmit({ data } as any);
  }

  describe('create', () => {
    it('does nothing for an unknown payment', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(contractClient.buildCreateTx).not.toHaveBeenCalled();
    });

    it('is a replay-safe no-op once the payment is already resolved', async () => {
      paymentRepository.findOne.mockResolvedValue(
        makePayment({ status: PaymentStatus.CONFIRMED }),
      );

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(contractClient.buildCreateTx).not.toHaveBeenCalled();
    });

    it('does nothing when the user has no custodial wallet yet', async () => {
      paymentRepository.findOne.mockResolvedValue(makePayment());
      walletsService.getWalletStatus.mockResolvedValue({ account: null });

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(contractClient.buildCreateTx).not.toHaveBeenCalled();
      expect(confirmationService.apply).not.toHaveBeenCalled();
    });

    it('confirms only after a fresh contract-state read shows LOCKED', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValue(payment);

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(contractClient.getEscrowStatus).toHaveBeenCalledWith(
        TREASURY.publicKey(),
        deriveEscrowId(payment.id),
      );
      expect(confirmationService.apply).toHaveBeenCalledWith(
        deriveEscrowId(payment.id).toString('hex'),
        'confirmed',
        expect.anything(),
        expect.any(String),
      );
    });

    it('never applies "confirmed" straight off a SUCCESS submission without the fresh read', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.NOT_FOUND);
      paymentRepository.findOne.mockResolvedValue(makePayment());

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(confirmationService.apply).not.toHaveBeenCalled();
    });

    it('leaves the payment AWAITING_CONFIRMATION when the bounded poll times out — never fails, never resubmits', async () => {
      contractClient.pollFinality.mockResolvedValue('NOT_FOUND');
      paymentRepository.findOne.mockResolvedValue(makePayment());

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(confirmationService.apply).not.toHaveBeenCalled();
      expect(contractClient.submit).toHaveBeenCalledTimes(1);
    });

    it('an RPC timeout on submit is treated as indeterminate — no failure, no duplicate submission', async () => {
      contractClient.submit.mockRejectedValue(new Error('Request timed out'));
      paymentRepository.findOne.mockResolvedValue(makePayment());

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(confirmationService.apply).not.toHaveBeenCalled();
      expect(contractClient.submit).toHaveBeenCalledTimes(1);
    });

    it('maps a sequence-number conflict to a definite failure with the right reason', async () => {
      contractClient.submit.mockRejectedValue(new Error('txBAD_SEQ'));
      confirmationService.apply.mockResolvedValue({
        status: PaymentStatus.FAILED,
      });
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValue(payment);

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(confirmationService.apply).toHaveBeenCalledWith(
        deriveEscrowId(payment.id).toString('hex'),
        'failed',
        expect.anything(),
        expect.any(String),
      );
      expect(paymentRepository.update).toHaveBeenCalledWith(payment.id, {
        failureReason: PaymentFailureReason.SEQUENCE_CONFLICT,
      });
    });

    it("treats a retried create against the contract's already-done guard as success via a fresh read", async () => {
      contractClient.submit.mockRejectedValue(new Error('escrow already released'));
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValue(payment);

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(contractClient.getEscrowStatus).toHaveBeenCalled();
      expect(confirmationService.apply).toHaveBeenCalledWith(
        deriveEscrowId(payment.id).toString('hex'),
        'confirmed',
        expect.anything(),
        expect.any(String),
      );
    });

    it('signs the transaction hash via the wallet, never touching a raw secret', async () => {
      const payment = makePayment();
      paymentRepository.findOne.mockResolvedValue(payment);

      await submitJob({ kind: 'create', paymentId: 'payment-1' });

      expect(walletsService.signPayload).toHaveBeenCalledWith(
        payment.userId,
        Buffer.from('txhash'),
        'soroban-escrow-create',
      );
    });
  });

  describe('release', () => {
    it('submits the release transaction and never touches Payment/confirmation state', async () => {
      await submitJob({
        kind: 'release',
        escrowIdHex: 'ab'.repeat(32),
        paymentId: 'payment-1',
      });

      expect(contractClient.buildReleaseTx).toHaveBeenCalledWith(
        TREASURY.publicKey(),
        Buffer.from('ab'.repeat(32), 'hex'),
      );
      expect(contractClient.submit).toHaveBeenCalledTimes(1);
      expect(confirmationService.apply).not.toHaveBeenCalled();
      expect(paymentRepository.update).not.toHaveBeenCalled();
    });

    it('treats an already-released guard as success, not an error', async () => {
      contractClient.submit.mockRejectedValue(new Error('already released'));

      await expect(
        submitJob({
          kind: 'release',
          escrowIdHex: 'ab'.repeat(32),
          paymentId: 'payment-1',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('refund', () => {
    it('submits the refund transaction against the treasury account', async () => {
      await submitJob({ kind: 'refund', escrowIdHex: 'cd'.repeat(32) });

      expect(contractClient.buildRefundTx).toHaveBeenCalledWith(
        TREASURY.publicKey(),
        Buffer.from('cd'.repeat(32), 'hex'),
      );
    });

    it('logs rather than throws on a genuine on-chain failure', async () => {
      contractClient.submit.mockRejectedValue(new Error('txBAD_SEQ'));

      await expect(
        submitJob({ kind: 'refund', escrowIdHex: 'cd'.repeat(32) }),
      ).resolves.toBeUndefined();
    });
  });
});
