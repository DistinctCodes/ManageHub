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

/**
 * Hand-written stand-in for what `stellar contract bindings typescript`
 * would generate against the deployed escrow contract (issue #1574's
 * "contract-first" requirement). It targets this reference ABI:
 *
 *   fn create(escrow_id: BytesN<32>, payer: Address, beneficiary: Address, amount: i128)
 *   fn release(escrow_id: BytesN<32>)
 *   fn refund(escrow_id: BytesN<32>)
 *   fn get_status(escrow_id: BytesN<32>) -> u32   // 0=NotFound 1=Locked 2=Released 3=Refunded
 *
 * Once a contract is deployed and real bindings are generated from its
 * actual ABI, this file is the one to replace — nothing else in the
 * module depends on how a call is encoded, only on the method signatures
 * below.
 */
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
   * Bounded poll — this does NOT wait indefinitely. A still-pending result
   * after the deadline is not a failure: the caller leaves the Payment
   * AWAITING_CONFIRMATION and the chain-state reconciliation job asks the
   * chain again later (issue #1574's "never assume, always ask" rule).
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
   * Fresh, direct read of contract state — the only thing allowed to
   * justify marking a Payment CONFIRMED (issue #1574's hard rule).
   * Read-only, so it's simulated but never submitted/signed.
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
    // Different SDK minor versions have shipped this under either
    // `result.retval` or `results[0].retval` — accept either shape.
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
