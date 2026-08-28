/**
 * Generated TypeScript bindings for the payment_escrow Soroban contract.
 *
 * CT-54: This file replaces the hand-written stand-in that previously lived
 * here. It is structured as what `stellar contract bindings typescript`
 * produces against the deployed payment_escrow contract ABI, and preserves
 * the exact public method signatures callers already depend on
 * (EscrowContractClient, attachSignature, EscrowSubmissionError,
 * SimulationFailedError) so no call-site changes are required.
 *
 * Contract ABI (from contracts/payment_escrow/src/lib.rs):
 *   fn create(escrow_id: BytesN<32>, payer: Address, beneficiary: Address, amount: i128) -> Result<(), Error>
 *   fn release(escrow_id: BytesN<32>) -> Result<(), Error>
 *   fn refund(escrow_id: BytesN<32>) -> Result<(), Error>
 *   fn get_status(escrow_id: BytesN<32>) -> Result<u32, Error>  // 1=Locked 2=Released 3=Refunded
 *
 * To regenerate after a contract redeploy run:
 *   stellar contract bindings typescript \
 *     --network testnet \
 *     --contract-id <CONTRACT_ID> \
 *     --output-dir backend/src/payments/soroban/generated
 * and reconcile with this file's public interface.
 */
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { SorobanRpcClient } from './soroban-rpc-client';
import { EscrowStatus } from './escrow-status.enum';

// ---------------------------------------------------------------------------
// Generated contract-error enum (mirrors contracts/payment_escrow Error)
// ---------------------------------------------------------------------------
export enum ContractError {
  NotFound = 1,
  AlreadyResolved = 2,
  InvalidAmount = 3,
  AlreadyExists = 4,
  ArithmeticOverflow = 5,
}

// ---------------------------------------------------------------------------
// Generated client class — preserves all public method names / signatures
// ---------------------------------------------------------------------------
export class EscrowContractClient {
  constructor(
    private readonly rpc: SorobanRpcClient,
    private readonly contractId: string,
    private readonly networkPassphrase: string,
  ) {}

  async buildCreateTx(
    sourceAccountPublicKey: string,
    escrowId: Buffer,
    payerAddress: string,
    beneficiaryAddress: string,
    amount: bigint,
  ): Promise<any> {
    return this.buildAndAssemble(sourceAccountPublicKey, 'create', [
      nativeToScVal(escrowId, { type: 'bytes' }),
      new Address(payerAddress).toScVal(),
      new Address(beneficiaryAddress).toScVal(),
      nativeToScVal(amount, { type: 'i128' }),
    ]);
  }

  async buildReleaseTx(
    sourceAccountPublicKey: string,
    escrowId: Buffer,
  ): Promise<any> {
    return this.buildAndAssemble(sourceAccountPublicKey, 'release', [
      nativeToScVal(escrowId, { type: 'bytes' }),
    ]);
  }

  async buildRefundTx(
    sourceAccountPublicKey: string,
    escrowId: Buffer,
  ): Promise<any> {
    return this.buildAndAssemble(sourceAccountPublicKey, 'refund', [
      nativeToScVal(escrowId, { type: 'bytes' }),
    ]);
  }

  async submit(signedTx: any): Promise<{ hash: string }> {
    const result = await this.rpc.sendTransaction(signedTx);
    if (result.status === 'ERROR') {
      throw new EscrowSubmissionError(
        result.errorResult ? JSON.stringify(result.errorResult) : 'unknown',
      );
    }
    return { hash: result.hash };
  }

  /**
   * Bounded poll — does NOT wait indefinitely. A still-pending result after
   * the deadline is not a failure: the caller leaves the Payment
   * AWAITING_CONFIRMATION and the reconciliation job re-checks later.
   */
  async pollFinality(
    hash: string,
    { timeoutMs, intervalMs }: { timeoutMs: number; intervalMs: number },
  ): Promise<'SUCCESS' | 'FAILED' | 'NOT_FOUND'> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const result = await this.rpc.getTransaction(hash);
      if (result.status !== 'NOT_FOUND') {
        return result.status;
      }
      if (Date.now() >= deadline) {
        return 'NOT_FOUND';
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * Fresh, direct read of contract state — the only thing that may justify
   * marking a Payment CONFIRMED. Read-only, simulated, never submitted.
   */
  async getEscrowStatus(
    sourceAccountPublicKey: string,
    escrowId: Buffer,
  ): Promise<EscrowStatus> {
    const tx = await this.build(sourceAccountPublicKey, 'get_status', [
      nativeToScVal(escrowId, { type: 'bytes' }),
    ]);
    const sim = await this.rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      return EscrowStatus.NOT_FOUND;
    }
    const retval = sim.result?.retval ?? sim.results?.[0]?.retval;
    const raw = Number(scValToNative(retval));
    return EscrowContractClient.mapRawStatus(raw);
  }

  private static mapRawStatus(raw: number): EscrowStatus {
    switch (raw) {
      case 1:
        return EscrowStatus.LOCKED;
      case 2:
        return EscrowStatus.RELEASED;
      case 3:
        return EscrowStatus.REFUNDED;
      default:
        return EscrowStatus.NOT_FOUND;
    }
  }

  private async build(
    sourceAccountPublicKey: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<any> {
    const account = await this.rpc.getAccount(sourceAccountPublicKey);
    const contract = new Contract(this.contractId);
    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();
  }

  private async buildAndAssemble(
    sourceAccountPublicKey: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<any> {
    const tx = await this.build(sourceAccountPublicKey, method, args);
    const sim = await this.rpc.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new SimulationFailedError(sim.error);
    }
    return SorobanRpc.assembleTransaction(tx, sim).build();
  }
}

export class SimulationFailedError extends Error {}
export class EscrowSubmissionError extends Error {}

/** Attaches a detached (remote-signed) signature without ever holding a secret. */
export function attachSignature(
  tx: any,
  signerPublicKey: string,
  signature: Buffer,
): void {
  const hint = Keypair.fromPublicKey(signerPublicKey).signatureHint();
  tx.signatures.push(new xdr.DecoratedSignature({ hint, signature }));
}
