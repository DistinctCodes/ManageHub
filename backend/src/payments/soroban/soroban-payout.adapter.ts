import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import {
  ExternalPayoutRail,
  PayoutStatus,
  PayoutSubmission,
  SubmitPayoutInput,
} from '../../credits/interfaces/external-payout-rail.interface';
import { EscrowContractClient } from './escrow-contract.client';
import { EscrowStatus } from './escrow-status.enum';
import { SorobanConfig } from './soroban-config';
import {
  ESCROW_CONTRACT_CLIENT,
  SOROBAN_CONFIG,
  SOROBAN_ESCROW_QUEUE,
} from './soroban.tokens';

/**
 * Implements the credit ledger's off-platform payout port (issue #1575)
 * over the #1574 Soroban escrow rail: a treasury-funded escrow created
 * for, and released to, the recipient — i.e. a transfer, expressed with
 * the contract this codebase already talks to.
 *
 * Two properties settlement depends on, and how they are provided:
 *
 *  - **Idempotent on `idempotencyKey`.** The escrow id is derived from the
 *    key by hash, so the same key always addresses the same on-chain
 *    record; the queue job id is derived from it too, so Bull collapses a
 *    duplicate enqueue. Re-submitting a payout is therefore a no-op rather
 *    than a second transfer.
 *  - **Submission is never treated as success.** `submitPayout` only
 *    enqueues, exactly as the escrow rail's own `initiate` does;
 *    `getPayoutStatus` is a fresh contract-state read, which is the only
 *    thing that ever moves a payout to CONFIRMED.
 */
@Injectable()
export class SorobanPayoutAdapter implements ExternalPayoutRail {
  constructor(
    @InjectQueue(SOROBAN_ESCROW_QUEUE) private readonly queue: Queue,
    @Inject(ESCROW_CONTRACT_CLIENT)
    private readonly contractClient: EscrowContractClient,
    @Inject(SOROBAN_CONFIG) private readonly sorobanConfig: SorobanConfig,
  ) {}

  /**
   * Deterministic escrow id for a payout — the same role
   * `deriveEscrowId(paymentId)` plays for a Payment, keyed on the
   * settlement payout's idempotency key instead. Kept distinct from the
   * payment derivation by a domain prefix so a payout can never collide
   * with a payment's escrow.
   */
  static deriveEscrowId(idempotencyKey: string): Buffer {
    return createHash('sha256')
      .update(`payout:${idempotencyKey}`, 'utf8')
      .digest();
  }

  async submitPayout(input: SubmitPayoutInput): Promise<PayoutSubmission> {
    const escrowId = SorobanPayoutAdapter.deriveEscrowId(input.idempotencyKey);
    const escrowIdHex = escrowId.toString('hex');

    await this.queue.add(
      'submit',
      {
        kind: 'payout',
        escrowIdHex,
        beneficiaryAddress: input.destinationAddress,
        amount: input.amount,
      },
      { jobId: `payout:${escrowIdHex}`, attempts: 1 },
    );

    return { reference: escrowIdHex };
  }

  /**
   * RELEASED is the only confirmation: the funds are with the recipient.
   * LOCKED means the escrow exists but the release has not landed yet, and
   * NOT_FOUND covers "the submission is still in flight" as much as
   * "nothing was created" — both are `pending`, never `failed`, so
   * settlement never marks entries settled (or gives up) on the strength
   * of a race against its own queue. Only REFUNDED — the escrow returned
   * to the treasury — is a definite failure.
   */
  async getPayoutStatus(reference: string): Promise<PayoutStatus> {
    const status = await this.contractClient.getEscrowStatus(
      this.sorobanConfig.treasuryPublicKey,
      Buffer.from(reference, 'hex'),
    );
    switch (status) {
      case EscrowStatus.RELEASED:
        return 'confirmed';
      case EscrowStatus.REFUNDED:
        return 'failed';
      case EscrowStatus.LOCKED:
      case EscrowStatus.NOT_FOUND:
        return 'pending';
    }
  }
}
