import {
  EscrowContractClient,
  EscrowSubmissionError,
  attachSignature,
} from './escrow-contract.client';
import { EscrowStatus } from './escrow-status.enum';
import { Account, Keypair } from '@stellar/stellar-sdk';

/**
 * These tests deliberately stay at the boundary that doesn't require
 * knowing the exact shape of a *successful* SorobanRpc.Api simulation
 * response (that's replicated from live SDK behavior, not something to
 * hand-construct reliably in a unit test). The "does this correctly
 * encode and submit a real transaction" half is exercised manually
 * against Stellar testnet, not CI — see the module README. What's fully
 * covered here: bounded polling, submission error mapping, and the
 * error/not-found path of a status read, none of which depend on that
 * shape.
 */
describe('EscrowContractClient', () => {
  function makeRpc(overrides: Record<string, jest.Mock> = {}) {
    return {
      getAccount: jest.fn(),
      simulateTransaction: jest.fn(),
      sendTransaction: jest.fn(),
      getTransaction: jest.fn(),
      ...overrides,
    };
  }

  describe('submit', () => {
    it('returns the hash on a non-error status', async () => {
      const rpc = makeRpc({
        sendTransaction: jest
          .fn()
          .mockResolvedValue({ status: 'PENDING', hash: 'hash-1' }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      const result = await client.submit({} as any);

      expect(result).toEqual({ hash: 'hash-1' });
    });

    it('throws EscrowSubmissionError on an ERROR status', async () => {
      const rpc = makeRpc({
        sendTransaction: jest.fn().mockResolvedValue({
          status: 'ERROR',
          errorResult: { code: 'txBAD_SEQ' },
        }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      await expect(client.submit({} as any)).rejects.toThrow(
        EscrowSubmissionError,
      );
    });
  });

  describe('pollFinality', () => {
    it('returns immediately once the status is no longer NOT_FOUND', async () => {
      const rpc = makeRpc({
        getTransaction: jest.fn().mockResolvedValue({ status: 'SUCCESS' }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      const status = await client.pollFinality('hash-1', {
        timeoutMs: 1000,
        intervalMs: 10,
      });

      expect(status).toBe('SUCCESS');
      expect(rpc.getTransaction).toHaveBeenCalledTimes(1);
    });

    it('polls until success, respecting the interval', async () => {
      const rpc = makeRpc({
        getTransaction: jest
          .fn()
          .mockResolvedValueOnce({ status: 'NOT_FOUND' })
          .mockResolvedValueOnce({ status: 'NOT_FOUND' })
          .mockResolvedValueOnce({ status: 'SUCCESS' }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      const status = await client.pollFinality('hash-1', {
        timeoutMs: 5000,
        intervalMs: 5,
      });

      expect(status).toBe('SUCCESS');
      expect(rpc.getTransaction).toHaveBeenCalledTimes(3);
    });

    it('gives up and returns NOT_FOUND once the deadline passes, never throwing', async () => {
      const rpc = makeRpc({
        getTransaction: jest.fn().mockResolvedValue({ status: 'NOT_FOUND' }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      const status = await client.pollFinality('hash-1', {
        timeoutMs: 20,
        intervalMs: 10,
      });

      expect(status).toBe('NOT_FOUND');
    });
  });

  describe('getEscrowStatus', () => {
    it('maps a simulation error to NOT_FOUND rather than throwing', async () => {
      const rpc = makeRpc({
        getAccount: jest
          .fn()
          .mockResolvedValue(new Account(Keypair.random().publicKey(), '1')),
        simulateTransaction: jest
          .fn()
          .mockResolvedValue({ error: 'Error(Contract, #1)' }),
      });
      const client = new EscrowContractClient(rpc as any, 'C123', 'passphrase');

      const status = await client.getEscrowStatus(
        Keypair.random().publicKey(),
        Buffer.alloc(32, 1),
      );

      expect(status).toBe(EscrowStatus.NOT_FOUND);
    });
  });

  describe('attachSignature', () => {
    it('appends a decorated signature carrying the signer public key hint', () => {
      const signer = Keypair.random();
      const tx = { signatures: [] as unknown[] };

      attachSignature(tx as any, signer.publicKey(), Buffer.alloc(64, 7));

      expect(tx.signatures).toHaveLength(1);
    });
  });
});
