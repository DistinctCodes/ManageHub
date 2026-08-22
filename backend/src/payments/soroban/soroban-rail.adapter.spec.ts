import { SorobanRailAdapter } from './soroban-rail.adapter';
import { EscrowStatus } from './escrow-status.enum';
import { deriveEscrowId } from './escrow-id';
import { Payment } from '../entities/payment.entity';
import { PaymentRail } from '../enums/payment-rail.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 1000,
    currency: 'USD',
    rail: PaymentRail.STELLAR_CUSTODIAL,
    provider: null,
    providerReference: null,
    status: PaymentStatus.INITIATED,
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

describe('SorobanRailAdapter', () => {
  let queue: { add: jest.Mock };
  let contractClient: { getEscrowStatus: jest.Mock };
  let sorobanConfig: { treasuryPublicKey: string };
  let adapter: SorobanRailAdapter;

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    contractClient = { getEscrowStatus: jest.fn() };
    sorobanConfig = { treasuryPublicKey: 'GTREASURY' };
    adapter = new SorobanRailAdapter(
      queue as any,
      contractClient as any,
      sorobanConfig as any,
    );
  });

  describe('initiate', () => {
    it('never calls the chain — it derives the escrow id and enqueues submission', async () => {
      const payment = makePayment();

      const result = await adapter.initiate(payment);

      expect(contractClient.getEscrowStatus).not.toHaveBeenCalled();
      expect(result.providerReference).toBe(
        deriveEscrowId(payment.id).toString('hex'),
      );
      expect(queue.add).toHaveBeenCalledWith(
        'submit',
        { kind: 'create', paymentId: payment.id },
        expect.objectContaining({ jobId: `create:${payment.id}` }),
      );
    });

    it('is idempotent under a duplicate initiate — same jobId both times', async () => {
      const payment = makePayment();

      await adapter.initiate(payment);
      await adapter.initiate(payment);

      const jobIds = queue.add.mock.calls.map((call) => call[2].jobId);
      expect(new Set(jobIds).size).toBe(1);
    });
  });

  describe('verifyByReference', () => {
    it('maps LOCKED (funds secured in escrow) to confirmed', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.LOCKED);
      const result = await adapter.verifyByReference('ab'.repeat(32));
      expect(result).toEqual({ outcome: 'confirmed' });
    });

    it('maps RELEASED to confirmed too — a later, separate action from create confirmation', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.RELEASED);
      const result = await adapter.verifyByReference('ab'.repeat(32));
      expect(result).toEqual({ outcome: 'confirmed' });
    });

    it('maps REFUNDED to failed', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.REFUNDED);
      const result = await adapter.verifyByReference('ab'.repeat(32));
      expect(result).toEqual({ outcome: 'failed' });
    });

    it('maps NOT_FOUND to pending, never a false failure', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.NOT_FOUND);
      const result = await adapter.verifyByReference('ab'.repeat(32));
      expect(result).toEqual({ outcome: 'pending' });
    });

    it('always performs a fresh chain read against the treasury account', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.LOCKED);
      const escrowIdHex = 'cd'.repeat(32);

      await adapter.verifyByReference(escrowIdHex);

      expect(contractClient.getEscrowStatus).toHaveBeenCalledWith(
        'GTREASURY',
        Buffer.from(escrowIdHex, 'hex'),
      );
    });
  });

  describe('refund', () => {
    it('enqueues a submit-refund job keyed by the escrow reference', async () => {
      await adapter.refund('ab'.repeat(32), 500);

      expect(queue.add).toHaveBeenCalledWith(
        'submit',
        { kind: 'refund', escrowIdHex: 'ab'.repeat(32) },
        expect.objectContaining({ jobId: `refund:${'ab'.repeat(32)}` }),
      );
    });
  });

  describe('release', () => {
    it('enqueues a submit-release job for a payment with an escrow reference', async () => {
      const payment = makePayment({ providerReference: 'ab'.repeat(32) });

      await adapter.release(payment);

      expect(queue.add).toHaveBeenCalledWith(
        'submit',
        {
          kind: 'release',
          escrowIdHex: 'ab'.repeat(32),
          paymentId: payment.id,
        },
        expect.objectContaining({ jobId: `release:${payment.id}` }),
      );
    });

    it('refuses to release a payment with no escrow reference yet', async () => {
      const payment = makePayment({ providerReference: null });

      await expect(adapter.release(payment)).rejects.toThrow();
      expect(queue.add).not.toHaveBeenCalled();
    });
  });

  describe('webhook methods', () => {
    it('verifyWebhookSignature always returns false — there is no webhook channel', () => {
      expect(
        adapter.verifyWebhookSignature({
          rawBody: Buffer.from(''),
          signatureHeader: 'x',
        }),
      ).toBe(false);
    });

    it('parseWebhookPayload always throws', () => {
      expect(() => adapter.parseWebhookPayload(Buffer.from(''))).toThrow();
    });
  });
});
