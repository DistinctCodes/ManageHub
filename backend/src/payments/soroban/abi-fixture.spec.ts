import * as fs from 'fs';
import * as path from 'path';
import { ContractError, EscrowContractClient } from './escrow-contract.client';
import { EscrowStatus } from './escrow-status.enum';
import { Address, Keypair, StrKey } from '@stellar/stellar-sdk';

interface AbiFunctionInput {
  name: string;
  type: string;
}

interface AbiFunction {
  name: string;
  doc?: string;
  inputs: AbiFunctionInput[];
  outputs: { type: string };
}

interface ContractAbiFixture {
  contract: string;
  version: number;
  functions: AbiFunction[];
  errors: Record<string, string>;
  states: Record<string, string>;
}

describe('Shared ABI & Interface Fixture Validation (#2025)', () => {
  let abiFixture: ContractAbiFixture;
  const CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32, 1));

  beforeAll(() => {
    const fixturePath = path.resolve(
      __dirname,
      'fixtures/payment_escrow.abi.json',
    );
    expect(fs.existsSync(fixturePath)).toBe(true);
    const raw = fs.readFileSync(fixturePath, 'utf-8');
    abiFixture = JSON.parse(raw);
  });

  describe('Contract Metadata & Version', () => {
    it('fixture identifies payment_escrow version 1', () => {
      expect(abiFixture.contract).toBe('payment_escrow');
      expect(abiFixture.version).toBe(1);
    });

    it('fixture defines required core escrow entrypoints', () => {
      const functionNames = abiFixture.functions.map((f) => f.name);
      expect(functionNames).toContain('create');
      expect(functionNames).toContain('release');
      expect(functionNames).toContain('refund');
      expect(functionNames).toContain('get_status');
      expect(functionNames).toContain('get_escrow');
      expect(functionNames).toContain('initialize');
      expect(functionNames).toContain('version');
      expect(functionNames).toContain('pause');
      expect(functionNames).toContain('unpause');
    });
  });

  describe('ContractError Enum Synchronization', () => {
    it('TypeScript ContractError enum matches every error code in the ABI fixture', () => {
      for (const [codeStr, name] of Object.entries(abiFixture.errors)) {
        const codeNum = parseInt(codeStr, 10);
        // The enum must have the exact key and numeric value
        expect(ContractError[name as keyof typeof ContractError]).toBe(codeNum);
        expect(ContractError[codeNum as any]).toBe(name);
      }
    });

    it('no extra undefined error codes exist in the client enum', () => {
      const enumKeys = Object.keys(ContractError).filter((k) =>
        isNaN(Number(k)),
      );
      const fixtureErrorNames = Object.values(abiFixture.errors);
      expect(enumKeys.sort()).toEqual(fixtureErrorNames.sort());
    });
  });

  describe('Client Transaction Builder Signatures vs ABI Spec', () => {
    function makeRpc() {
      return {
        getAccount: jest.fn().mockResolvedValue({
          sequenceNumber: () => '100',
          accountId: () => Keypair.random().publicKey(),
          incrementSequenceNumber: jest.fn(),
        }),
        simulateTransaction: jest.fn(),
        sendTransaction: jest.fn(),
        getTransaction: jest.fn(),
      };
    }

    it('buildCreateTx matches create entrypoint signature in fixture', async () => {
      const createFn = abiFixture.functions.find((f) => f.name === 'create');
      expect(createFn).toBeDefined();
      expect(createFn?.inputs.map((i) => i.name)).toEqual([
        'escrow_id',
        'payer',
        'beneficiary',
        'amount',
        'token',
      ]);

      const client = new EscrowContractClient(
        makeRpc() as any,
        CONTRACT_ID,
        'passphrase',
      );
      jest
        .spyOn(client as any, 'buildAndAssemble')
        .mockImplementation(async (source, method, args) => {
          return (client as any).build(source, method, args);
        });

      const payer = Keypair.random().publicKey();
      const beneficiary = Keypair.random().publicKey();
      const token = Keypair.random().publicKey();
      const escrowId = Buffer.alloc(32, 42);

      const tx = await client.buildCreateTx(
        payer,
        escrowId,
        payer,
        beneficiary,
        1000n,
        token,
      );

      expect(tx.operations).toHaveLength(1);
      const op = tx.operations[0] as any;
      expect(op.type).toBe('invokeHostFunction');
      // Verify invoked contract function is 'create'
      const fnName = op.func.invokeContract().functionName().toString();
      expect(fnName).toBe('create');
      // Verify 5 parameters passed matching ABI input count
      const callArgs = op.func.invokeContract().args();
      expect(callArgs).toHaveLength(5);
    });

    it('buildReleaseTx matches release entrypoint signature in fixture', async () => {
      const releaseFn = abiFixture.functions.find((f) => f.name === 'release');
      expect(releaseFn).toBeDefined();
      expect(releaseFn?.inputs.map((i) => i.name)).toEqual(['escrow_id']);

      const client = new EscrowContractClient(
        makeRpc() as any,
        CONTRACT_ID,
        'passphrase',
      );
      jest
        .spyOn(client as any, 'buildAndAssemble')
        .mockImplementation(async (source, method, args) => {
          return (client as any).build(source, method, args);
        });

      const caller = Keypair.random().publicKey();
      const escrowId = Buffer.alloc(32, 99);

      const tx = await client.buildReleaseTx(caller, escrowId);

      expect(tx.operations).toHaveLength(1);
      const op = tx.operations[0] as any;
      const fnName = op.func.invokeContract().functionName().toString();
      expect(fnName).toBe('release');
      expect(op.func.invokeContract().args()).toHaveLength(1);
    });

    it('buildRefundTx matches refund entrypoint signature in fixture', async () => {
      const refundFn = abiFixture.functions.find((f) => f.name === 'refund');
      expect(refundFn).toBeDefined();
      expect(refundFn?.inputs.map((i) => i.name)).toEqual(['escrow_id']);

      const client = new EscrowContractClient(
        makeRpc() as any,
        CONTRACT_ID,
        'passphrase',
      );
      jest
        .spyOn(client as any, 'buildAndAssemble')
        .mockImplementation(async (source, method, args) => {
          return (client as any).build(source, method, args);
        });

      const caller = Keypair.random().publicKey();
      const escrowId = Buffer.alloc(32, 88);

      const tx = await client.buildRefundTx(caller, escrowId);

      expect(tx.operations).toHaveLength(1);
      const op = tx.operations[0] as any;
      const fnName = op.func.invokeContract().functionName().toString();
      expect(fnName).toBe('refund');
      expect(op.func.invokeContract().args()).toHaveLength(1);
    });
  });

  describe('Status Code Mapping', () => {
    it('EscrowStatus enum aligns with fixture numeric state codes', () => {
      expect((EscrowContractClient as any).mapRawStatus(1)).toBe(
        EscrowStatus.LOCKED,
      );
      expect((EscrowContractClient as any).mapRawStatus(2)).toBe(
        EscrowStatus.RELEASED,
      );
      expect((EscrowContractClient as any).mapRawStatus(3)).toBe(
        EscrowStatus.REFUNDED,
      );
    });
  });
});
