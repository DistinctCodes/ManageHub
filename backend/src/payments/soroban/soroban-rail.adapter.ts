import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Payment } from '../entities/payment.entity';
import {
  PaymentInitiationResult,
  PaymentRailAdapter,
  PaymentVerificationResult,
  WebhookPayload,
  WebhookSignatureInput,
} from '../interfaces/payment-rail-adapter.interface';
import { deriveEscrowId } from './escrow-id';
import { EscrowContractClient } from './escrow-contract.client';
import { EscrowStatus } from './escrow-status.enum';
import { SorobanConfig } from './soroban-config';
import {
  ESCROW_CONTRACT_CLIENT,
  SOROBAN_CONFIG,
  SOROBAN_ESCROW_QUEUE,
} from './soroban.tokens';

/**
 * Soroban escrow rail (issue #1574): create/release/refund/status against
 * the deployed escrow contract. `initiate` never talks to the chain on
 * the request thread — it derives the escrow_id, enqueues the actual
 * submission, and returns immediately so the caller gets a fast
 * AWAITING_CONFIRMATION Payment (see EscrowSubmissionProcessor for the
 * build -> simulate -> sign -> submit -> poll pipeline).
 *
 * Soroban has no webhook channel — finality is only ever discovered by
 * asking the chain (the processor's own poll, or reconciliation). The two
 * webhook methods below exist only to satisfy PaymentRailAdapter and are
 * never meant to be called; PaymentWebhookController is wired to the
 * fiat/sandbox rail's webhook endpoint, not this one.
 */
@Injectable()
export class SorobanRailAdapter implements PaymentRailAdapter {
  constructor(
    @InjectQueue(SOROBAN_ESCROW_QUEUE) private readonly queue: Queue,
    @Inject(ESCROW_CONTRACT_CLIENT)
    private readonly contractClient: EscrowContractClient,
    @Inject(SOROBAN_CONFIG) private readonly sorobanConfig: SorobanConfig,
  ) {}

  async initiate(payment: Payment): Promise<PaymentInitiationResult> {
    const escrowId = deriveEscrowId(payment.id);
    await this.queue.add(
      'submit',
      { kind: 'create', paymentId: payment.id },
      { jobId: `create:${payment.id}`, attempts: 1 },
    );
    return {
      providerReference: escrowId.toString('hex'),
      metadata: { rail: 'soroban', escrowId: escrowId.toString('hex') },
    };
  }

  verifyWebhookSignature(_input: WebhookSignatureInput): boolean {
    return false;
  }

  parseWebhookPayload(_rawBody: Buffer): WebhookPayload {
    throw new Error(
      'The Soroban rail has no webhook channel — confirmation only ever comes from a fresh chain-state read',
    );
  }

  /**
   * Always a fresh, direct read of contract state (issue #1574's hard
   * rule) — never derived from a submission response. This is what both
   * the verify-on-return fast path and scheduled reconciliation call.
   *
   * Escrow status -> Payment outcome mapping: LOCKED means the payer's
   * funds are secured in escrow — that's this rail's "charge succeeded"
   * moment, same as a captured charge on the fiat rail, so it maps to
   * `confirmed` (RELEASED is a later, separate business action layered on
   * an already-CONFIRMED payment — see `release()` — and still counts as
   * confirmed if observed here). REFUNDED means the escrow was returned to
   * the payer before ever confirming — that's a failed payment. NOT_FOUND
   * covers "not on-chain yet" (submission still in flight) as much as
   * "genuinely doesn't exist" — treated as pending, not failed, so we
   * never race a false negative against our own async submission
   * pipeline.
   */
  async verifyByReference(
    providerReference: string,
  ): Promise<PaymentVerificationResult> {
    const escrowId = Buffer.from(providerReference, 'hex');
    const status = await this.contractClient.getEscrowStatus(
      this.sorobanConfig.treasuryPublicKey,
      escrowId,
    );
    switch (status) {
      case EscrowStatus.LOCKED:
      case EscrowStatus.RELEASED:
        return { outcome: 'confirmed' };
      case EscrowStatus.REFUNDED:
        return { outcome: 'failed' };
      case EscrowStatus.NOT_FOUND:
        return { outcome: 'pending' };
    }
  }

  async refund(providerReference: string, _amount: number): Promise<void> {
    await this.queue.add(
      'submit',
      { kind: 'refund', escrowIdHex: providerReference },
      { jobId: `refund:${providerReference}`, attempts: 1 },
    );
  }

  /**
   * Escrow-specific action beyond the shared PaymentRailAdapter interface
   * — releases funds to the beneficiary. Not wired to any automatic
   * trigger yet (there's no booking-completion event in this codebase to
   * hang it off); exposed here for an admin action or a future booking
   * module to call.
   */
  async release(payment: Payment): Promise<void> {
    if (!payment.providerReference) {
      throw new Error(`Payment ${payment.id} has no escrow reference yet`);
    }
    await this.queue.add(
      'submit',
      {
        kind: 'release',
        escrowIdHex: payment.providerReference,
        paymentId: payment.id,
      },
      { jobId: `release:${payment.id}`, attempts: 1 },
    );
  }
}
