import { createHash } from 'crypto';
import { SorobanPayoutAdapter } from './soroban-payout.adapter';
import { EscrowStatus } from './escrow-status.enum';
import { deriveEscrowId } from './escrow-id';

describe('SorobanPayoutAdapter', () => {
  let queue: { add: jest.Mock };
  let contractClient: { getEscrowStatus: jest.Mock };
  let sorobanConfig: { treasuryPublicKey: string };
  let adapter: SorobanPayoutAdapter;

  const payout = {
    destinationAddress: 'GOPERATORADDRESS',
    amount: 25_000,
    currency: 'USD',
    idempotencyKey: 'settlement:batch-1:account:account-7',
  };

  beforeEach(() => {
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    contractClient = { getEscrowStatus: jest.fn() };
    sorobanConfig = { treasuryPublicKey: 'GTREASURY' };
    adapter = new SorobanPayoutAdapter(
      queue as any,
      contractClient as any,
      sorobanConfig as any,
    );
  });

  describe('submitPayout', () => {
    it('never calls the chain — it derives the escrow id and enqueues', async () => {
      const result = await adapter.submitPayout(payout);

      expect(contractClient.getEscrowStatus).not.toHaveBeenCalled();
      const escrowIdHex = createHash('sha256')
        .update(`payout:${payout.idempotencyKey}`, 'utf8')
        .digest('hex');
      expect(result.reference).toBe(escrowIdHex);
      expect(queue.add).toHaveBeenCalledWith(
        'submit',
        {
          kind: 'payout',
          escrowIdHex,
          beneficiaryAddress: payout.destinationAddress,
          amount: payout.amount,
        },
        { jobId: `payout:${escrowIdHex}`, attempts: 1 },
      );
    });

    /**
     * Settlement's whole retry story rests on this: the same idempotency
     * key must always address the same on-chain record, so re-submitting
     * cannot create a second transfer.
     */
    it('derives the same escrow id for the same idempotency key', async () => {
      const first = await adapter.submitPayout(payout);
      const second = await adapter.submitPayout(payout);

      expect(second.reference).toBe(first.reference);
      expect(queue.add.mock.calls[0][2].jobId).toBe(
        queue.add.mock.calls[1][2].jobId,
      );
    });

    it('derives different escrow ids for different payouts', async () => {
      const first = await adapter.submitPayout(payout);
      const second = await adapter.submitPayout({
        ...payout,
        idempotencyKey: 'settlement:batch-1:account:account-8',
      });
      expect(second.reference).not.toBe(first.reference);
    });

    /**
     * A payout escrow and a payment escrow must never be able to collide,
     * or a settlement could address a member's payment escrow.
     */
    it('cannot collide with a payment’s escrow id', () => {
      const paymentId = 'e2f1c0d4-0000-0000-0000-000000000001';
      expect(
        SorobanPayoutAdapter.deriveEscrowId(paymentId).toString('hex'),
      ).not.toBe(deriveEscrowId(paymentId).toString('hex'));
    });
  });

  describe('getPayoutStatus', () => {
    async function statusFor(escrowStatus: EscrowStatus) {
      contractClient.getEscrowStatus.mockResolvedValue(escrowStatus);
      return adapter.getPayoutStatus('a1b2c3');
    }

    it('confirms only a RELEASED escrow — the funds are with the recipient', async () => {
      await expect(statusFor(EscrowStatus.RELEASED)).resolves.toBe('confirmed');
    });

    it('treats LOCKED as pending: created, but not yet released', async () => {
      await expect(statusFor(EscrowStatus.LOCKED)).resolves.toBe('pending');
    });

    /**
     * NOT_FOUND covers "the submission is still queued" as much as
     * "nothing was created", so calling it a failure would race settlement
     * against its own queue.
     */
    it('treats NOT_FOUND as pending, never as failed', async () => {
      await expect(statusFor(EscrowStatus.NOT_FOUND)).resolves.toBe('pending');
    });

    it('reports REFUNDED as failed — the escrow came back', async () => {
      await expect(statusFor(EscrowStatus.REFUNDED)).resolves.toBe('failed');
    });

    it('reads fresh contract state, from the treasury’s point of view', async () => {
      contractClient.getEscrowStatus.mockResolvedValue(EscrowStatus.RELEASED);
      await adapter.getPayoutStatus('a1b2c3');

      expect(contractClient.getEscrowStatus).toHaveBeenCalledWith(
        'GTREASURY',
        Buffer.from('a1b2c3', 'hex'),
      );
    });

    it('propagates a rail error instead of inventing a verdict', async () => {
      contractClient.getEscrowStatus.mockRejectedValue(
        new Error('rpc unreachable'),
      );
      await expect(adapter.getPayoutStatus('a1b2c3')).rejects.toThrow(
        'rpc unreachable',
      );
    });
  });
});
